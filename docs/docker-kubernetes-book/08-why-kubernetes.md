# Chapter 8 — From One Host to Many: Why Kubernetes

> **Level 68 → 72.** Compose runs Verndly beautifully on *one* machine. This chapter is
> the honest list of everything that falls apart when one machine isn't enough — and
> how Kubernetes answers each failure. No YAML yet; just the *why*, so the next
> chapters land as solutions to problems you can feel.

---

## 8.1 The day Compose stops being enough

Verndly launches. Traffic grows. You hit walls, one by one:

**1. The machine dies.** Your single Docker host reboots / its disk fails / the cloud
provider retires the instance. Verndly is *down* until a human notices and rebuilds.
Compose's `restart: unless-stopped` only restarts a *process* on a *living* host — it
can't survive the host itself dying.

**2. One machine isn't big enough.** Black Friday. You need 20 API replicas, but they
won't fit on one box. You need to spread containers across *many* machines — and
something has to decide *which* container goes *where*.

**3. Deploys cause downtime.** `docker compose up --build` stops the old container and
starts the new one — there's a gap where Verndly returns errors. You want **zero-downtime
rolling updates**: bring up new, drain old, never drop a request.

**4. A bad deploy needs instant rollback.** The new API build has a fatal bug. You
want one command to revert to the previous known-good version — fast, deterministic.

**5. Scaling is manual and dumb.** Traffic doubles at noon, halves at night. You're
hand-editing replica counts. You want it to **autoscale** on CPU/RAM/custom metrics.

**6. Config & secrets sprawl.** Env vars are copy-pasted across hosts. Rotating
`JWT_SECRET` means SSHing into machines. You want **centralized, versioned config and
secrets** decoupled from the container.

**7. Service discovery across machines.** With containers spread over 10 hosts, how
does `web` find a healthy `api` replica that might be on any of them? Compose's
single-host DNS doesn't reach across machines.

**8. Self-healing.** A replica wedges (deadlock, memory leak) but doesn't crash, so
nothing restarts it. You want the platform to **health-check and replace** it
automatically.

🧠 Notice the pattern: every one of these is about going from **one host** to **a
fleet**, and from **manual** to **declarative + automated**. That is precisely the job
of a **container orchestrator**.

---

## 8.2 What an orchestrator does

```
                    ┌──────────────────────────────────────────┐
   You declare      │  "I want 5 healthy api replicas, v1.4.2,  │
   DESIRED STATE ──▶│   reachable at api:1000, max 512Mi each"   │
                    └───────────────────┬──────────────────────┘
                                        │  the orchestrator continuously
                                        ▼  RECONCILES reality → desired
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │  node A  │   │  node B  │   │  node C  │   │  node D  │   (a fleet of machines)
   │ api,api  │   │ api,web  │   │ api, pg  │   │ web,redis│
   └──────────┘   └──────────┘   └──────────┘   └──────────┘
        ▲ node C dies → orchestrator reschedules its pods onto A/B/D automatically
```

An orchestrator:
- **Schedules** containers onto a pool of machines (bin-packing by available CPU/RAM).
- **Heals**: restarts/reschedules failed containers; replaces ones on dead nodes.
- **Scales**: adds/removes replicas on demand or automatically.
- **Networks**: gives every container a routable identity + load-balances across replicas.
- **Rolls out / rolls back**: updates versions gradually, reversibly.
- **Manages config/secrets/storage** as first-class, versioned objects.

**Kubernetes (K8s)** is the orchestrator that won. It came out of Google's internal
"Borg," is now CNCF-governed, and runs on every cloud (EKS, GKE, AKS) and on-prem.

---

## 8.3 The one idea that makes Kubernetes click: declarative reconciliation

This is the soul of K8s. You don't tell it *steps* ("start a container, then…").
You declare the **desired state** as objects ("there should be a Deployment of 5
api replicas at v1.4.2"). A set of **controllers** run an endless loop:

```
   loop forever:
       observed = look at the actual cluster
       desired  = read the declared objects
       if observed ≠ desired:
           take actions to close the gap
```

```
   Desired:  5 api replicas        Observed: 4 running (one node died)
                          \                 /
                           ▼               ▼
                   ┌─────────────────────────────┐
                   │  controller notices: 4 ≠ 5   │
                   │  → schedules 1 new replica   │
                   └─────────────────────────────┘
                           now observed = 5 = desired ✅
```

🧠 You already met this idea: `docker compose up` reconciles toward the state in your
YAML. Kubernetes does it **continuously, forever, across many machines** — not once at
`up` time. *Self-healing isn't a feature bolted on; it's a side effect of always
reconciling toward desired state.* Internalize this and 80% of K8s behavior becomes
predictable.

---

## 8.4 The vocabulary shift (Compose → Kubernetes)

You're not starting over. You're renaming and distributing concepts you know:

| You know (Compose / Docker) | Becomes (Kubernetes) | What's new |
|-----------------------------|----------------------|-----------|
| a running container | inside a **Pod** | the smallest deployable unit; can hold >1 container |
| `service:` with `replicas` | **Deployment** → **ReplicaSet** → Pods | manages N identical pods, rollouts |
| `ports:` publish | **Service** | stable virtual IP + DNS + load-balancing across pods |
| external URL / reverse proxy | **Ingress** / Gateway | HTTP routing + TLS into the cluster |
| `environment:` | **ConfigMap** / **Secret** | versioned, mountable, cluster-wide |
| named `volume:` | **PersistentVolume + Claim** | storage decoupled from pods |
| `healthcheck:` | **liveness / readiness / startup probes** | richer health semantics |
| a stateful service (Postgres) | **StatefulSet** | stable identity + storage per replica |
| `restart:` | controller reconciliation | heals across the whole fleet |
| one host | a **cluster** of **nodes** | the whole point |

---

## 8.5 When *not* to use Kubernetes (the honest take)

🏢 Even top teams don't K8s everything. Reach for it when you have: multiple services,
real scale, a platform team to operate it, and need for self-healing/rollouts. For a
solo project or a single low-traffic service, Compose on one VM — or a PaaS like
Verndly's current Vercel/Render — is *less operational burden* and totally legitimate.

Kubernetes is powerful **and** complex. The complexity is justified by fleet-scale
operations; it is *not* free. We learn it here because (a) it's the industry standard
you'll be expected to know, and (b) Verndly's shape (web + api + db + cache) is the
perfect teaching vehicle. But "should *this particular app* be on K8s today?" is a
real engineering question with a frequently-"no" answer.

---

## 8.6 What we'll build in Part III

By the end of Chapter 15, Verndly will run on a real (local) Kubernetes cluster:

```
                    ┌────────────────── Kubernetes cluster ──────────────────┐
   Internet ──▶ Ingress ──▶ web Service ──▶ [web pod] [web pod]               │
                  │                                                            │
                  └──────▶ api Service  ──▶ [api pod] [api pod] [api pod]      │
                                               │            │                  │
                                               ▼            ▼                  │
                                      postgres Service   redis Service         │
                                       (StatefulSet)      (StatefulSet)        │
                                            │                                  │
                                      PersistentVolume (durable disk)          │
                    └────────────────────────────────────────────────────────┘
   + ConfigMaps/Secrets for env, HPA for autoscaling, probes for self-healing,
     a Job for `prisma db push`, and a Helm chart to template it all.
```

Everything you learned about Verndly's images carries over unchanged — Kubernetes
*pulls the very images CI built in Chapter 7*. We're not rebuilding the app; we're
giving it a fleet to live on.

---

## 8.7 Mental model check

1. Compose has `restart: unless-stopped`. Why isn't that "self-healing" in the K8s sense?
2. State the reconciliation loop in one sentence. Why does it make self-healing
   automatic rather than a separate feature?
3. Give two concrete situations where you'd tell a team *not* to adopt Kubernetes.
4. In the Compose→K8s table, what replaces `environment:` and why is it better at scale?

<details>
<summary>Answers</summary>

1. It only restarts a process on a *still-living* host and on a *single* machine. If
   the host dies, nothing reschedules the workload elsewhere. K8s reschedules onto
   surviving nodes.
2. "Continuously compare observed vs. desired state and act to close the gap." Because
   the loop never stops, any drift (a crashed pod, a dead node) is detected and
   corrected automatically — healing is just reconciliation in action.
3. A single low-traffic service; a small team with no platform/ops capacity; a
   short-lived prototype — the operational complexity outweighs the benefits; a PaaS
   or single-VM Compose is simpler.
4. **ConfigMaps/Secrets.** They're cluster-wide, versioned, injectable into many pods
   at once, and let you rotate config/secrets centrally instead of editing each host.
</details>

---

**Next:** [Chapter 9 — Kubernetes Architecture](09-kubernetes-architecture.md)
