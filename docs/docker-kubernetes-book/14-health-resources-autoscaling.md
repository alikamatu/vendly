# Chapter 14 — Health, Resources & Autoscaling

> **Level 92 → 94.** The mechanics that make Kubernetes *self-healing and elastic*:
> probes (liveness/readiness/startup), resource requests & limits (how the scheduler
> packs and the kernel caps), and autoscaling (HPA pods, Cluster Autoscaler nodes).
> This is where Chapter 8's promises become concrete behavior for Verndly.

---

## 14.1 The three probes (and why you need all three)

A probe is a periodic check the kubelet runs against a container. Three kinds, three
*different questions*:

```
   startupProbe    "has it FINISHED booting yet?"   → protects slow starters
   readinessProbe  "is it ready for TRAFFIC now?"   → controls Service membership
   livenessProbe   "is it WEDGED — should I kill it?"→ triggers a restart
```

```
   container starts
        │
        ▼  startupProbe runs first; liveness/readiness are paused until it passes
   [ booting... ] ──pass──▶ [ running ]
                                 │
              readinessProbe ────┤── fail ──▶ removed from Service endpoints (no traffic)
                                 │            pass ──▶ added back
              livenessProbe  ────┴── fail ──▶ kubelet RESTARTS the container
```

### Readiness vs liveness — the distinction that matters most
- **Readiness fail** → "don't send me traffic *right now*" (e.g. still warming the
  cache, DB connection pool not up). The pod is **not killed**; it's just pulled out of
  the load-balancer rotation until it recovers.
- **Liveness fail** → "I'm broken, restart me" (e.g. deadlocked, event loop stuck).
  The kubelet **kills and restarts** the container.

⚠️ **The classic outage:** pointing a *liveness* probe at a dependency. If your
liveness check hits the database and the DB hiccups, K8s kills *all* your API pods
(none are "live") — turning a brief DB blip into a full outage and a restart storm.
**Liveness = "is the process itself healthy?" Readiness = "can it serve, including
dependencies?"** Keep liveness cheap and self-contained.

### 📦 Verndly's probes
The Dockerfiles already define a Docker `HEALTHCHECK` hitting `http://127.0.0.1:1000/`.
In K8s we express the same intent as probes on the Deployment (Chapter 10):

```yaml
readinessProbe:                 # gate traffic + safe rolling updates
  httpGet: { path: /, port: 1000 }
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3
livenessProbe:                  # restart only if the process is truly wedged
  httpGet: { path: /, port: 1000 }
  initialDelaySeconds: 25
  periodSeconds: 15
  failureThreshold: 3
startupProbe:                   # give a cold NestJS boot up to ~50s before liveness kicks in
  httpGet: { path: /, port: 1000 }
  failureThreshold: 10
  periodSeconds: 5
```

🏢 Best practice: add **dedicated** endpoints — `/healthz` (liveness: trivial, returns
200 if the process runs) and `/readyz` (readiness: checks DB/Redis reachability).
NestJS's `@nestjs/terminus` provides exactly this. Verndly currently probes `/`; a
`/healthz` + `/readyz` split is the recommended upgrade.

Probe types: `httpGet` (HTTP 2xx/3xx = pass), `tcpSocket` (port open = pass),
`exec` (command exit 0 = pass — used for `pg_isready`/`redis-cli ping` in Chapter 13),
and `grpc`.

---

## 14.2 Resource requests & limits

Every container should declare what it needs and its ceiling:

```yaml
resources:
  requests:                 # what the SCHEDULER reserves to place the pod
    cpu: "100m"             # 100 millicores = 0.1 of a CPU core
    memory: "256Mi"
  limits:                   # the hard ceiling the KERNEL enforces (cgroups, Ch 1)
    cpu: "500m"
    memory: "512Mi"
```

- **`requests`** = the amount guaranteed/reserved. The **scheduler** uses requests to
  decide which node has room (bin-packing). Too-high requests → pods can't be placed
  (`Pending`). Too-low → nodes get overcommitted and thrash.
- **`limits`** = the maximum. Backed by **cgroups** (the exact mechanism from Chapter
  1!). Exceeding:
  - **CPU over limit** → *throttled* (slowed), not killed.
  - **Memory over limit** → **OOMKilled** (exit code 137) and restarted.

🧠 This closes the loop from Chapter 1: namespaces isolate, cgroups limit — and
`resources.limits` is how you *declare* those cgroup limits in K8s. The same lever as
`docker run --memory/--cpus` (Chapter 5), now scheduler-aware across the fleet.

### QoS classes (how K8s decides who to evict under pressure)
| Class | When | Evicted… |
|-------|------|----------|
| **Guaranteed** | requests == limits for all resources | last |
| **Burstable** | requests < limits | middle |
| **BestEffort** | no requests/limits | first |

📦 For Verndly's API/web, set requests *and* limits (Burstable, leaning toward
Guaranteed for predictable nodes). Never run prod pods BestEffort — they're first to
be evicted when a node runs hot.

⚠️ **Always set memory requests/limits.** A leaky pod with no memory limit can consume
the whole node and take its neighbors down ("noisy neighbor"). Limits contain the
blast radius.

---

## 14.3 Horizontal Pod Autoscaler (HPA) — scale pods automatically

The HPA watches a metric (CPU by default) and adjusts a Deployment's `replicas` to
keep it near a target. This is the answer to Chapter 8's "traffic doubles at noon."

```
   target: 60% CPU                     observed avg CPU across api pods
   ┌─────────────────────────────────────────────────────────────┐
   │  85% > 60%  → scale UP   (more replicas until avg ≈ 60%)      │
   │  30% < 60%  → scale DOWN (fewer replicas, respecting minReplicas)│
   └─────────────────────────────────────────────────────────────┘
```

```yaml
# k8s/api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api, namespace: verndly }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 60 }
  behavior:                          # tame flapping
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5m of low load before scaling down
```

```bash
$ kubectl autoscale deploy/api --cpu-percent=60 --min=3 --max=20 -n verndly  # imperative
$ kubectl get hpa -n verndly
NAME   REFERENCE         TARGETS   MINPODS   MAXPODS   REPLICAS
api    Deployment/api    42%/60%   3         20        4
```

🧠 **HPA needs `requests` to work** — "60% CPU" means 60% *of the requested CPU*. No
request → no percentage → HPA can't compute. This is why §14.2 isn't optional: probes
make deploys safe, requests make autoscaling possible.

🏢 Beyond CPU: scale on memory, custom app metrics (requests/sec, queue depth via
Prometheus Adapter), or external metrics (SQS length) with **KEDA**. Real systems
scale on the metric that actually reflects load — for Verndly's API, requests/sec or
p95 latency is more meaningful than raw CPU.

There's also the **Vertical Pod Autoscaler** (right-sizes requests/limits over time)
and, for batch, scaling to/from zero with KEDA.

---

## 14.4 Cluster Autoscaler — scale the *nodes*

HPA adds pods; but pods need nodes to land on. If new pods are `Pending` for lack of
capacity, the **Cluster Autoscaler** (on managed clouds) provisions more nodes; when
nodes sit idle, it removes them.

```
   HPA: "I need 15 api pods"  → 4 pods Pending (no room)
        │
        ▼
   Cluster Autoscaler: "add 2 nodes" → cloud spins up VMs → Pending pods schedule
        ... later, load drops, pods removed, nodes drained + deleted (cost ↓)
```

Two layers of elasticity: **HPA scales pods, Cluster Autoscaler scales nodes.**
Together Verndly handles a 10× Black Friday spike automatically and shrinks back at
night to save money. (On kind there's a fixed node count — this is a cloud feature.)

---

## 14.5 PodDisruptionBudget — protect availability during *voluntary* disruptions

When a node is drained for maintenance/upgrade, K8s evicts its pods. A **PDB** caps how
many can be down at once so you don't accidentally take the whole service offline:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api, namespace: verndly }
spec:
  minAvailable: 2            # keep ≥2 api pods up during drains/upgrades
  selector: { matchLabels: { app: api } }
```

🏢 Standard practice for any multi-replica prod service. Pair with anti-affinity
(spread replicas across nodes/zones) so one node/zone failure can't take all replicas.

---

## 14.6 📦 Putting Verndly's reliability story together

```
   readiness/liveness/startup probes  → self-healing + zero-downtime rollouts
   requests/limits                     → fair scheduling, contained blast radius
   HPA (3→20 on 60% CPU)               → handles traffic spikes
   Cluster Autoscaler                  → adds nodes when pods don't fit
   PodDisruptionBudget (minAvailable 2)→ stays up during maintenance
   anti-affinity (spread across nodes) → survives a node/zone loss
```

Every Chapter-8 grievance now has a concrete mechanism. The app image didn't change —
we wrapped it in operational guarantees.

---

## 14.7 Mental model check

1. A DB blip makes your liveness probe (which queries the DB) fail on all API pods.
   What happens, and what's the design fix?
2. Why does the HPA require resource `requests` to be set?
3. CPU over limit vs memory over limit — what does the kernel do in each case?
4. What's the difference between the HPA and the Cluster Autoscaler?

<details>
<summary>Answers</summary>

1. K8s kills/restarts *every* API pod (none are "live") → full outage + restart storm
   from a transient blip. Fix: liveness must check only the *process* health; put
   dependency checks (DB/Redis) in **readiness**, which removes a pod from traffic
   without killing it.
2. HPA's CPU target is a percentage *of the requested CPU*. With no request there's no
   denominator, so utilization can't be computed and the HPA can't scale.
3. CPU over limit → **throttled** (slowed). Memory over limit → **OOMKilled**
   (terminated with exit 137) and restarted.
4. **HPA** changes the number of *pods* in a Deployment based on metrics. **Cluster
   Autoscaler** changes the number of *nodes* (VMs) so pending pods have somewhere to
   run. Pods first, then capacity for them.
</details>

---

**Next:** [Chapter 15 — Deploying Verndly to Kubernetes (+ Helm)](15-deploying-verndly-k8s.md)
