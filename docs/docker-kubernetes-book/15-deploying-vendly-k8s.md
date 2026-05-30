# Chapter 15 — Deploying Verndly to Kubernetes (+ Helm)

> **Level 94 → 97.** The capstone. We assemble every object from Chapters 10–14 into a
> complete, working deployment of Verndly — namespace, config/secrets, the schema-push
> Job (via an init container), Deployments, Services, Ingress, HPA, PDB — apply it to
> kind, then **template the whole thing as a Helm chart** so dev/staging/prod differ
> by values, not copy-paste.

---

## 15.1 The full picture we're building

```
   namespace: verndly
   ┌──────────────────────────────────────────────────────────────────────┐
   │  Ingress (verndly.com, api.verndly.com) ── TLS                     │
   │     │                          │                                       │
   │     ▼                          ▼                                       │
   │  Service web (ClusterIP)    Service api (ClusterIP)                    │
   │     │                          │                                       │
   │  Deployment web             Deployment api  ◀── ConfigMap + Secret     │
   │  (2 replicas, HPA)          (3–20 replicas, HPA, PDB)                  │
   │                                │   initContainer: wait-for-db + db push│
   │                                ▼                                       │
   │  Service postgres ──▶ StatefulSet postgres ──▶ PVC 20Gi                │
   │  Service redis    ──▶ StatefulSet redis    ──▶ PVC 5Gi                 │
   │  CronJob pro-expiry ─▶ Service api                                     │
   └──────────────────────────────────────────────────────────────────────┘
   (prod swaps the postgres/redis StatefulSets for managed Supabase/Redis Cloud)
```

---

## 15.2 Raw manifests — directory layout

```
k8s/
├── 00-namespace.yaml
├── 01-api-config.yaml         # ConfigMap        (Ch 12)
├── 02-api-secrets.yaml        # Secret (don't commit real values)
├── 03-web-config.yaml
├── 10-postgres.yaml           # StatefulSet + headless Service (Ch 13)
├── 11-redis.yaml              # StatefulSet + headless Service
├── 20-api-deployment.yaml     # Deployment (+ init container) (Ch 10/14)
├── 21-api-service.yaml        # Service (Ch 11)
├── 22-api-hpa.yaml            # HPA (Ch 14)
├── 23-api-pdb.yaml            # PodDisruptionBudget
├── 30-web-deployment.yaml
├── 31-web-service.yaml
├── 40-ingress.yaml            # Ingress (Ch 11)
└── 50-cronjob-pro-expiry.yaml # CronJob (Ch 10)
```

Most of these you've already seen. The **new** piece is wiring the schema push *into*
the deployment so it's automatic — no manual `kubectl exec`.

---

## 15.3 The schema push, automated (init container)

In Chapter 6 you ran `prisma db push` by hand on first boot. In K8s, an **init
container** runs to completion *before* the app container starts — perfect for "make
sure the DB is migrated before serving." We also add a tiny "wait for DB" init step so
the API never boots against an unreachable database.

```yaml
# 20-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api, namespace: verndly, labels: { app: api } }
spec:
  replicas: 3
  selector: { matchLabels: { app: api } }
  strategy:
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    metadata: { labels: { app: api } }
    spec:
      initContainers:
        - name: wait-for-db                       # block until Postgres answers
          image: postgres:16-alpine
          command: ["sh","-c","until pg_isready -h postgres -p 5432; do echo waiting; sleep 2; done"]
        - name: db-push                           # apply the Prisma schema, then exit
          image: ghcr.io/your-org/verndly-api:1.4.2
          command: ["node_modules/.bin/prisma","db","push","--skip-generate"]
          envFrom:
            - secretRef: { name: api-secrets }     # needs DATABASE_URL
      containers:
        - name: api
          image: ghcr.io/your-org/verndly-api:1.4.2
          ports: [{ containerPort: 1000 }]
          envFrom:
            - configMapRef: { name: api-config }
            - secretRef:    { name: api-secrets }
          resources:
            requests: { cpu: "100m", memory: "256Mi" }
            limits:    { cpu: "500m", memory: "512Mi" }
          readinessProbe: { httpGet: { path: /, port: 1000 }, initialDelaySeconds: 10, periodSeconds: 10 }
          livenessProbe:  { httpGet: { path: /, port: 1000 }, initialDelaySeconds: 25, periodSeconds: 15 }
          startupProbe:   { httpGet: { path: /, port: 1000 }, failureThreshold: 10, periodSeconds: 5 }
```

🧠 **Init containers run sequentially, to completion, before app containers.** If
`db-push` fails, the pod never serves — exactly what you want (don't run code against
an unmigrated DB).

⚠️ **One caveat at scale:** with 3 replicas, all three run `db-push` on rollout.
`prisma db push` is idempotent so it's *safe*, but it's wasteful and can race on big
migrations. The cleaner pattern is a **one-shot `Job`** (or a Helm pre-upgrade
**hook**) that runs the migration *once* per deploy, with the Deployment only doing
`wait-for-db`. We use the Helm hook approach in §15.6 — the FAANG-correct way.

---

## 15.4 Deploy to kind (end to end)

```bash
# 1. cluster + namespace
$ kind create cluster --name verndly
$ kubectl apply -f k8s/00-namespace.yaml
$ kubectl config set-context --current --namespace=verndly

# 2. build images and load them into kind (no registry needed locally)
$ docker build -f apps/api/Dockerfile -t verndly-api:dev .
$ docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 -t verndly-web:dev .
$ kind load docker-image verndly-api:dev verndly-web:dev --name verndly
#   (then set image: verndly-api:dev / verndly-web:dev and imagePullPolicy: IfNotPresent in the manifests)

# 3. config + secrets
$ kubectl create secret generic api-secrets -n verndly \
    --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
    --from-literal=DATABASE_URL="postgresql://verndly:verndly@postgres:5432/verndly?schema=public" \
    --from-literal=DIRECT_URL="postgresql://verndly:verndly@postgres:5432/verndly?schema=public" \
    --from-literal=POSTGRES_PASSWORD="verndly" \
    --from-literal=CRON_SECRET="$(openssl rand -hex 16)"
$ kubectl apply -f k8s/01-api-config.yaml -f k8s/03-web-config.yaml

# 4. stateful infra (dev only; prod uses managed)
$ kubectl apply -f k8s/10-postgres.yaml -f k8s/11-redis.yaml
$ kubectl rollout status statefulset/postgres

# 5. apps + networking + scaling
$ kubectl apply -f k8s/20-api-deployment.yaml -f k8s/21-api-service.yaml \
                -f k8s/22-api-hpa.yaml -f k8s/23-api-pdb.yaml \
                -f k8s/30-web-deployment.yaml -f k8s/31-web-service.yaml \
                -f k8s/40-ingress.yaml -f k8s/50-cronjob-pro-expiry.yaml

# 6. verify
$ kubectl get pods,svc,ingress,hpa
$ kubectl logs -f deploy/api
$ kubectl port-forward svc/web 3000:3000     # → http://localhost:3000
```

You now have the entire Verndly platform self-healing, load-balanced, and autoscaling on
Kubernetes — built from the **exact same images** as Chapter 4.

---

## 15.5 The pain of raw YAML (why Helm exists)

You have ~14 files. Now you need a **staging** environment: different image tags,
fewer replicas, `verndly-staging.market` hostnames, smaller resources, managed DB. Your
options with raw YAML: copy all 14 files and hand-edit dozens of fields, then keep two
(soon three) near-identical trees in sync forever. That's how drift and 3am surprises
are born.

**Helm** is the package manager for Kubernetes. It templates your manifests and fills
them from a **values file per environment**. One chart, many environments.

```
   chart (templates with {{ placeholders }})  +  values-prod.yaml   → prod manifests
                                               +  values-staging.yaml→ staging manifests
                                               +  values-dev.yaml    → dev manifests
```

---

## 15.6 📦 A Helm chart for Verndly

```
charts/verndly/
├── Chart.yaml
├── values.yaml              # defaults
├── values-staging.yaml      # overrides
├── values-prod.yaml         # overrides
└── templates/
    ├── _helpers.tpl
    ├── api-deployment.yaml
    ├── api-service.yaml
    ├── api-hpa.yaml
    ├── web-deployment.yaml
    ├── web-service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── migrate-job.yaml      # Helm hook: runs prisma db push ONCE per release
    └── cronjob.yaml
```

**`Chart.yaml`**
```yaml
apiVersion: v2
name: verndly
description: Verndly marketplace (api + web)
version: 0.1.0           # chart version
appVersion: "1.4.2"      # default app image version
```

**`values.yaml`** (the knobs each environment overrides)
```yaml
image:
  registry: ghcr.io/your-org
  tag: "1.4.2"           # pinned, immutable (Ch 7)
api:
  replicas: 3
  resources:
    requests: { cpu: 100m, memory: 256Mi }
    limits:    { cpu: 500m, memory: 512Mi }
  autoscaling: { enabled: true, minReplicas: 3, maxReplicas: 20, targetCPU: 60 }
web:
  replicas: 2
ingress:
  host: verndly.com
  apiHost: api.verndly.com
config:
  NEXT_PUBLIC_API_URL: https://api.verndly.com   # build-arg AND runtime, in lockstep
  FRONTEND_URL: https://verndly.com
# secrets are NOT here — they come from ESO/Sealed Secrets (Ch 12)
```

**`templates/api-deployment.yaml`** (excerpt — note the templating + config checksum)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-api
  labels: {{- include "verndly.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.api.replicas }}
  selector: { matchLabels: { app: api } }
  template:
    metadata:
      labels: { app: api }
      annotations:
        # change the ConfigMap → checksum changes → automatic rolling restart (Ch 12 §12.6)
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.registry }}/verndly-api:{{ .Values.image.tag }}"
          ports: [{ containerPort: 1000 }]
          envFrom:
            - configMapRef: { name: {{ .Release.Name }}-api-config }
            - secretRef:    { name: api-secrets }
          resources: {{- toYaml .Values.api.resources | nindent 12 }}
          readinessProbe: { httpGet: { path: /, port: 1000 }, periodSeconds: 10 }
          livenessProbe:  { httpGet: { path: /, port: 1000 }, periodSeconds: 15 }
```

**`templates/migrate-job.yaml`** — the **once-per-release** schema push (Helm hook):
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-db-push
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install      # runs before the app rolls out
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: prisma
          image: "{{ .Values.image.registry }}/verndly-api:{{ .Values.image.tag }}"
          command: ["node_modules/.bin/prisma","db","push","--skip-generate"]
          envFrom: [{ secretRef: { name: api-secrets } }]
```

🧠 **Helm hooks** run at lifecycle points (`pre-install`, `pre-upgrade`, `post-…`).
Putting `prisma db push` in a `pre-upgrade` hook Job means the migration runs **exactly
once** before the new pods roll — solving the "all replicas run it" problem from §15.3.
This is the production-correct pattern.

**`values-prod.yaml`** (managed DB, bigger scale)
```yaml
image: { tag: "1.4.2" }
api: { replicas: 5, autoscaling: { maxReplicas: 40 } }
# point at managed Supabase/Redis: DATABASE_URL/REDIS_URL live in the prod Secret (ESO)
# no postgres/redis StatefulSets in prod
```

### Using the chart
```bash
$ helm install verndly ./charts/verndly -n verndly --create-namespace          # dev defaults
$ helm upgrade verndly ./charts/verndly -n verndly -f charts/verndly/values-prod.yaml  # prod
$ helm upgrade --install verndly ./charts/verndly -f values-staging.yaml -n staging  # staging
$ helm history verndly -n verndly        # releases + revisions
$ helm rollback verndly 3 -n verndly     # instant rollback to revision 3
$ helm template verndly ./charts/verndly -f values-prod.yaml   # render without applying (review!)
```

📦 Now dev/staging/prod are **one chart** + three values files. Want 40 API replicas in
prod and 1 in dev? One line per environment. No copy-paste, no drift. `helm rollback`
gives you the same instant-revert superpower as `kubectl rollout undo`, but for the
*whole release* (all objects) at once.

🏢 Helm is the most common templating tool; the main alternative is **Kustomize**
(overlay-based, no templating language — built into `kubectl -k`). Many teams use
Kustomize for env overlays and Helm for third-party charts. Both feed the GitOps flow
in Chapter 16.

---

## 15.7 Deploy checklist (production)

```
□ Images pinned to immutable tags/digests (no :latest)            (Ch 7)
□ Namespace + RBAC + ResourceQuota per environment                (Ch 9/16)
□ ConfigMaps for config, Secrets via ESO/Sealed (not plaintext)   (Ch 12)
□ Migrations via a once-per-release Job/Helm hook                 (§15.6)
□ Deployments: probes + requests/limits + rolling strategy        (Ch 10/14)
□ Services (ClusterIP) + ONE Ingress with TLS                     (Ch 11)
□ HPA on a meaningful metric + Cluster Autoscaler                 (Ch 14)
□ PodDisruptionBudget + anti-affinity (spread across nodes/zones) (Ch 14)
□ Stateful data on managed services (or a mature Operator)        (Ch 13)
□ Helm/Kustomize per-env values; rollback rehearsed               (§15.6)
```

---

## 15.8 Mental model check

1. Why run `prisma db push` as a Helm `pre-upgrade` hook Job instead of an init
   container on the Deployment?
2. With 14 raw YAML files, what specifically goes wrong when you add a staging env, and
   how does Helm fix it?
3. What does the `checksum/config` pod annotation accomplish?
4. In prod, why do the postgres/redis StatefulSets disappear from the values file?

<details>
<summary>Answers</summary>

1. An init container runs in *every* replica (3×) on every rollout — wasteful and can
   race. A `pre-upgrade` hook Job runs the migration **once** per release, before pods
   roll. Idempotent `db push` is safe either way, but the hook is the correct,
   single-execution pattern.
2. You'd copy/hand-edit ~14 files per environment and keep them in sync forever →
   drift and mistakes. Helm uses one templated chart + a values file per env, so
   differences are a few lines, not duplicated trees.
3. It hashes the ConfigMap into the pod template. When config changes, the hash (and
   thus the template) changes, triggering an automatic rolling restart so pods pick up
   the new env — no manual `rollout restart`.
4. Production uses **managed Supabase + Redis Cloud** (Ch 13). The app just points
   `DATABASE_URL`/`REDIS_URL` at the managed hosts (via the prod Secret), so there are
   no in-cluster stateful workloads to template.
</details>

---

**End of Part III.** Verndly runs on Kubernetes. The final chapter is what separates a
working deploy from a *FAANG-grade operation*: GitOps, observability, security
hardening, service mesh, troubleshooting, and interview prep.

**Next:** [Chapter 16 — Production: GitOps, Observability, Security & Interview Prep](16-production-faang.md)
