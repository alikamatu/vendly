# Chapter 10 — Pods, Deployments & Workload Controllers

> **Level 77 → 82.** The objects that actually run your code: Pods (the atom),
> ReplicaSets, Deployments (what you'll use 95% of the time), plus DaemonSets, Jobs,
> and CronJobs. We write the **real Verndly API Deployment** and run it on the kind
> cluster, then map Verndly's needs to the right controller.

---

## 10.1 The Pod — the smallest deployable unit

A **Pod** wraps one (or a few tightly-coupled) containers that share:
- a **network namespace** (same IP, same `localhost`, shared ports),
- **storage volumes**,
- a lifecycle (scheduled together, live/die together on one node).

```
   ┌──────────────── Pod (one IP: 10.244.1.7) ────────────────┐
   │   ┌──────────────┐   (optional sidecar)  ┌────────────┐   │
   │   │  api          │ ◀── localhost ──────▶ │  log-shipper│  │
   │   │ node main.js  │                       │  / proxy    │  │
   │   │  :1000        │                       └────────────┘   │
   │   └──────────────┘                                          │
   │   shared: network namespace, volumes, lifecycle             │
   └────────────────────────────────────────────────────────────┘
```

🧠 **Why a wrapper around a container at all?** Because sometimes you need helper
containers glued to the main one — a **sidecar** (log shipper, metrics exporter,
service-mesh proxy) or an **init container** (run *before* the app: wait for the DB,
run a migration). They share the pod's network/volumes, so coordination is trivial.
For Verndly, each app is one container per pod — the common case — but the model leaves
room for sidecars (we use an init container for `prisma db push` in Chapter 15).

⚠️ **You almost never create bare Pods.** A standalone Pod has no self-healing — if it
dies, nothing recreates it. You create *controllers* that manage Pods for you. A bare
Pod is for one-off debugging only.

### The Pod lifecycle / phases
`Pending` (accepted, not yet running — scheduling or pulling image) → `Running` →
`Succeeded` (exited 0, for Jobs) / `Failed` / `Unknown`. Common stuck states you'll
debug: `ImagePullBackOff` (can't pull the image), `CrashLoopBackOff` (container keeps
crashing → check `kubectl logs`), `Pending` (no node has room → check resources/taints).

---

## 10.2 ReplicaSet — N identical pods, kept alive

A **ReplicaSet** ensures *exactly* `replicas` copies of a pod template are running. If
one dies, it makes another. It's the self-healing engine — but you rarely write one
directly, because…

---

## 10.3 Deployment — the workhorse (use this)

A **Deployment** manages ReplicaSets to give you **declarative updates with rollouts
and rollbacks**. The hierarchy:

```
   Deployment  (you declare: image v1.4.2, 3 replicas, update strategy)
       │  owns
       ▼
   ReplicaSet  (one per version — controls the pod count for that version)
       │  owns
       ▼
   Pods        [api-1] [api-2] [api-3]
```

When you change the image, the Deployment creates a **new** ReplicaSet (for v1.4.3),
scales it up while scaling the old one down — a **rolling update**. Roll back and it
just scales the old ReplicaSet back up. This is exactly the zero-downtime deploy and
instant rollback that Compose couldn't give you (Chapter 8).

---

## 10.4 📦 The Verndly API Deployment (annotated)

Save as `k8s/api-deployment.yaml`. (Config/secrets via `envFrom` come in Chapter 12;
probes are detailed in Chapter 14 — shown here so you see the whole shape.)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: verndly
  labels: { app: api }
spec:
  replicas: 3                       # desired: 3 identical API pods
  selector:
    matchLabels: { app: api }       # which pods this Deployment owns
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0             # never drop below 3 ready during a deploy
      maxSurge: 1                   # may temporarily run 4 (1 extra) while rolling
  template:                         # ← the Pod blueprint the ReplicaSet stamps out
    metadata:
      labels: { app: api }          # MUST match spec.selector.matchLabels
    spec:
      containers:
        - name: api
          image: ghcr.io/your-org/verndly-api:1.4.2   # immutable tag from CI (Ch 7)
          ports:
            - containerPort: 1000
          envFrom:                  # pull env from a ConfigMap + Secret (Ch 12)
            - configMapRef: { name: api-config }
            - secretRef:    { name: api-secrets }
          resources:                # scheduling + limits (Ch 14)
            requests: { cpu: "100m", memory: "256Mi" }
            limits:    { cpu: "500m", memory: "512Mi" }
          readinessProbe:           # "ready to receive traffic?" (Ch 14)
            httpGet: { path: /, port: 1000 }
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:            # "should I restart it?" (Ch 14)
            httpGet: { path: /, port: 1000 }
            initialDelaySeconds: 25
            periodSeconds: 15
```

### The three things that trip everyone up
1. **`selector.matchLabels` must equal `template.metadata.labels`.** The Deployment
   finds "its" pods by label. Mismatch → it owns zero pods and spins up duplicates.
   Labels are the universal glue in K8s — Services find pods the same way (Chapter 11).
2. **`image` is immutable + pinned** to the CI-built SHA/semver — not `:latest`
   (Chapter 7). To deploy a new version you change *this line* and `kubectl apply`.
3. **`replicas` is desired state.** Manually `kubectl delete pod api-xyz` and the
   ReplicaSet immediately makes a replacement — observed must equal desired.

Apply and watch self-healing live:
```bash
$ kubectl apply -f k8s/api-deployment.yaml
$ kubectl get pods -l app=api
NAME                   READY   STATUS    RESTARTS   AGE
api-7d9f6c5b4d-2xk9p   1/1     Running   0          20s
api-7d9f6c5b4d-8nq4r   1/1     Running   0          20s
api-7d9f6c5b4d-lm2vt   1/1     Running   0          20s

$ kubectl delete pod api-7d9f6c5b4d-2xk9p     # kill one
$ kubectl get pods -l app=api                  # a replacement appears within seconds
```

---

## 10.5 Rollouts & rollbacks (the deploy superpower)

```bash
# Deploy a new version (edit image tag in YAML, then apply) — or imperatively:
$ kubectl set image deploy/api api=ghcr.io/your-org/verndly-api:1.4.3 -n verndly

$ kubectl rollout status deploy/api -n verndly        # watch it progress
deployment "api" successfully rolled out

$ kubectl rollout history deploy/api -n verndly       # see revisions
$ kubectl rollout undo deploy/api -n verndly          # instant rollback to previous
$ kubectl rollout undo deploy/api --to-revision=2 -n verndly
```

```
   Rolling update with maxUnavailable=0, maxSurge=1:

   v1.4.2:  [▣][▣][▣]
            [▣][▣][▣][+]      ← add one v1.4.3 (surge), wait until READY
            [▣][▣]   [▣]      ← then remove one v1.4.2
            [▣][▣][+][▣]
            [▣]   [▣][▣]
            ...
   v1.4.3:  [▣][▣][▣]         ← never fewer than 3 ready → zero downtime
```

🧠 **Readiness probes make rolling updates safe.** A new pod receives traffic only
*after* its readiness probe passes. `maxUnavailable: 0` guarantees you never have
fewer than the desired ready replicas during the swap. This is why Chapter 14's probes
aren't optional polish — they're load-bearing for safe deploys.

---

## 10.6 The other workload controllers (when to reach for each)

### DaemonSet — one pod per node
Runs a copy on *every* node (or a subset). For node-level agents: log collectors
(Fluent Bit), metrics (node-exporter), CNI, storage drivers. 📦 Verndly's apps aren't
DaemonSets, but the cluster's log/metrics agents are.

### Job — run-to-completion
Runs pods until they **succeed**, then stops. For batch/one-off tasks: a data
migration, a backfill. 📦 **This is how we'll run `prisma db push`** — a Job that
applies the schema and exits, instead of the manual `docker compose exec` from
Chapter 6.

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: db-push, namespace: verndly }
spec:
  backoffLimit: 3                 # retry up to 3 times on failure
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: prisma
          image: ghcr.io/your-org/verndly-api:1.4.2
          command: ["node_modules/.bin/prisma", "db", "push", "--skip-generate"]
          envFrom:
            - secretRef: { name: api-secrets }   # needs DATABASE_URL
```

### CronJob — scheduled Jobs
Creates a Job on a cron schedule. 📦 **Perfect for Verndly's cron endpoints** — recall
the API exposes `POST /cron/subscriptions/expiring` (sending Pro-expiry reminders),
gated by an `X-Cron-Token`. A CronJob can `curl` it nightly:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: pro-expiry-reminders, namespace: verndly }
spec:
  schedule: "0 9 * * *"           # 09:00 every day
  concurrencyPolicy: Forbid       # don't overlap runs
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: curl
              image: curlimages/curl:8.10.1
              args:
                - "-fsS"
                - "-X"
                - "POST"
                - "-H"
                - "X-Cron-Token: $(CRON_SECRET)"
                - "http://api:1000/cron/subscriptions/expiring"
              env:
                - name: CRON_SECRET
                  valueFrom:
                    secretKeyRef: { name: api-secrets, key: CRON_SECRET }
```

🧠 Notice it calls `http://api:1000` — the **Service** name (Chapter 11), resolvable
cluster-wide. The CronJob doesn't care which API pod answers.

### StatefulSet — stable identity + storage
For stateful apps (Postgres, Redis) that need stable network names and per-replica
persistent disks. Big enough that it gets its own chapter (13).

### Decision table
| Need | Controller |
|------|-----------|
| Stateless web/API, N replicas, rollouts | **Deployment** (api, web) |
| One pod on every node (agents) | **DaemonSet** |
| Run once to completion (migration) | **Job** (prisma db push) |
| Run on a schedule | **CronJob** (pro-expiry reminders) |
| Stateful, stable identity + disk | **StatefulSet** (postgres, redis) |

---

## 10.7 📦 Mapping Verndly to controllers

```
   web        → Deployment   (stateless, scalable, rolling updates)
   api        → Deployment   (stateless, scalable, rolling updates)
   postgres   → StatefulSet  (Ch 13)  [prod: managed Supabase instead]
   redis      → StatefulSet  (Ch 13)  [prod: managed Redis Cloud instead]
   db schema  → Job          (prisma db push, runs once per deploy)
   pro-expiry → CronJob      (nightly POST to /cron/subscriptions/expiring)
```

Two stateless Deployments are the heart of the app; everything else supports them.

---

## 10.8 Mental model check

1. Why do you almost never create a bare `Pod`?
2. A Deployment shows 3/3 ready, you `kubectl delete pod` one — what happens and which
   controller is responsible?
3. Why must `selector.matchLabels` match `template.metadata.labels`?
4. Which controller fits `prisma db push`, and which fits the nightly Pro-expiry job?
   Why not a Deployment for either?

<details>
<summary>Answers</summary>

1. A bare Pod isn't self-healing — nothing recreates it if it dies or its node fails.
   Use a controller (Deployment/Job/etc.) that manages Pods for you.
2. The ReplicaSet (owned by the Deployment) sees observed(2) ≠ desired(3) and creates
   a replacement pod within seconds. Reconciliation = self-healing.
3. The Deployment uses the selector to identify which pods it owns. If labels don't
   match, it owns zero pods and creates extras, while the orphaned pods linger.
4. `prisma db push` → a **Job** (run once to completion, then stop). Nightly job → a
   **CronJob** (scheduled Jobs). A Deployment is for long-running services that should
   *never* exit; a finishing task under a Deployment would be endlessly "restarted."
</details>

---

**Next:** [Chapter 11 — Services, Ingress & Cluster Networking](11-services-and-networking.md)
