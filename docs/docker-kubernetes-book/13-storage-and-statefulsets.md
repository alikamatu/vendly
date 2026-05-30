# Chapter 13 — Storage & StatefulSets (Postgres, Redis)

> **Level 89 → 92.** Pods are disposable; databases must not be. This chapter covers
> persistent storage (PV/PVC/StorageClass), why stateful apps need a different
> controller (StatefulSet), and the big architectural call for Verndly: **run Postgres
> in-cluster, or use managed Supabase?** (Spoiler: usually managed — and we explain
> exactly why.)

---

## 13.1 The storage abstraction: PV, PVC, StorageClass

Recall Chapter 5: container writable layers are ephemeral; data needs a volume that
outlives the container. Kubernetes splits this into three objects so that *app
authors* don't need to know *how* storage is provisioned:

```
   StorageClass   "HOW to make disks"   (e.g. AWS gp3, GCP pd-ssd)  — set by cluster admin
        │ dynamically provisions
        ▼
   PersistentVolume (PV)   "an ACTUAL disk"   (a real 20Gi SSD in the cloud)
        ▲ bound to
        │
   PersistentVolumeClaim (PVC)   "I WANT 20Gi"   — written by the app/StatefulSet
        ▲ mounted by
        │
   Pod   volumeMounts → /var/lib/postgresql/data
```

- **PersistentVolume (PV)** — a piece of real storage in the cluster (a cloud disk, an
  NFS share). The "supply."
- **PersistentVolumeClaim (PVC)** — a *request* for storage ("I need 20Gi,
  ReadWriteOnce"). The "demand." K8s binds a claim to a matching volume.
- **StorageClass** — describes *how* to dynamically create PVs on demand (which cloud
  disk type, IOPS, reclaim policy). With dynamic provisioning, you write a PVC and the
  PV is created automatically — no manual disk wrangling.

🧠 The whole point: a pod says "give me 20Gi" (PVC); the cluster figures out the rest.
The PVC is the contract. If the pod dies and reschedules, it re-attaches to the **same**
PVC → same data. Storage is decoupled from compute, just like volumes in Docker — only
now it works across a fleet of nodes.

### Access modes
- `ReadWriteOnce` (RWO) — one node mounts read/write. The norm for databases.
- `ReadOnlyMany` (ROX) — many nodes read-only.
- `ReadWriteMany` (RWX) — many nodes read/write (needs special backends like NFS).

---

## 13.2 Why Deployments are wrong for databases

A Deployment treats pods as **interchangeable cattle**: any pod, any name, any node,
any (shared or none) storage. Great for stateless `api`/`web`. Catastrophic for
Postgres, which needs:

1. **Stable identity.** A replica must keep the *same* name across restarts
   (`postgres-0`, not a random hash) — for replication, quorum, and clients that
   address a specific member.
2. **Stable, per-replica storage.** Each replica owns *its own* disk. `postgres-0`'s
   data must follow `postgres-0` forever; you can't have replicas sharing or swapping
   PVCs.
3. **Ordered, controlled lifecycle.** Start/stop/upgrade in order (`-0`, then `-1`…),
   not all at once — important for clustered databases.

Deployments guarantee none of these. **StatefulSets** guarantee all three.

---

## 13.3 StatefulSet — stable identity + per-pod storage

```yaml
# k8s/postgres-statefulset.yaml  (in-cluster Postgres for non-prod)
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: postgres, namespace: verndly }
spec:
  serviceName: postgres            # the *headless* Service (below) for stable DNS
  replicas: 1
  selector: { matchLabels: { app: postgres } }
  template:
    metadata: { labels: { app: postgres } }
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports: [{ containerPort: 5432 }]
          env:
            - { name: POSTGRES_USER,     value: verndly }
            - { name: POSTGRES_DB,       value: verndly }
            - name: POSTGRES_PASSWORD
              valueFrom: { secretKeyRef: { name: api-secrets, key: POSTGRES_PASSWORD } }
            - { name: PGDATA, value: /var/lib/postgresql/data/pgdata }
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
          readinessProbe:
            exec: { command: ["pg_isready", "-U", "verndly", "-d", "verndly"] }
            periodSeconds: 10
  volumeClaimTemplates:            # ← the StatefulSet magic
    - metadata: { name: data }
      spec:
        accessModes: ["ReadWriteOnce"]
        resources: { requests: { storage: 20Gi } }
        # storageClassName: gp3   # omit on kind to use the default
```

```yaml
# headless Service: clusterIP: None → DNS returns pod IPs directly,
# giving each replica a stable name: postgres-0.postgres.verndly.svc.cluster.local
apiVersion: v1
kind: Service
metadata: { name: postgres, namespace: verndly }
spec:
  clusterIP: None
  selector: { app: postgres }
  ports: [{ port: 5432, targetPort: 5432 }]
```

What the StatefulSet gives you that a Deployment can't:
- Pods are named `postgres-0`, `postgres-1`, … (ordinal, **stable**).
- `volumeClaimTemplates` mints a **dedicated PVC per pod** (`data-postgres-0`). When
  `postgres-0` reschedules, it re-binds to `data-postgres-0` → **same data**.
- The headless Service gives each pod a **stable DNS name**:
  `postgres-0.postgres.verndly.svc.cluster.local`.

📦 The app still connects via the regular `postgres:5432` Service name — `DATABASE_URL`
is unchanged from Compose. The StatefulSet machinery is invisible to the application;
it matters to the *database's* identity and storage.

🧠 **`pg_isready` as a readiness probe** is the K8s twin of Compose's healthcheck
(Chapter 6). Same idea, same command — now driving Service membership and startup
ordering. Concepts you already learned, redeployed.

---

## 13.4 Redis in-cluster

For a cache, persistence is often optional (the data is rebuildable). A simple
single-replica StatefulSet (or even a Deployment if you accept a cold cache on
restart) suffices:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: redis, namespace: verndly }
spec:
  serviceName: redis
  replicas: 1
  selector: { matchLabels: { app: redis } }
  template:
    metadata: { labels: { app: redis } }
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          args: ["redis-server", "--save", "60", "1", "--loglevel", "warning"]
          ports: [{ containerPort: 6379 }]
          volumeMounts: [{ name: data, mountPath: /data }]
          readinessProbe:
            exec: { command: ["redis-cli", "ping"] }
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: ["ReadWriteOnce"]
        resources: { requests: { storage: 5Gi } }
```

📦 Recall Verndly's API was built to **degrade gracefully** when Redis is unreachable
(it falls back to an in-memory cache — that was a deliberate fix during the Render
deploy). That resilience matters: a Redis pod restart won't take the API down, it just
loses cache warmth briefly.

---

## 13.5 The big decision: run databases in-cluster, or use managed?

This is a genuine senior-level architecture call, and the honest answer for most teams
— including Verndly — is **use a managed database in production.**

```
   ┌──────────────────────────────┬──────────────────────────────────────┐
   │  In-cluster (StatefulSet)     │  Managed (Supabase / RDS / Cloud SQL) │
   ├──────────────────────────────┼──────────────────────────────────────┤
   │ + full control, no vendor lock│ + backups, PITR, failover = done for  │
   │ + cheap for dev / learning    │   you                                 │
   │ - YOU own backups, HA,        │ + automated patching, scaling, HA      │
   │   failover, patching, tuning  │ + read replicas, connection pooling    │
   │ - storage ops are hard &      │ - costs more, some vendor coupling      │
   │   high-stakes (data loss!)    │ - lives outside the cluster network     │
   └──────────────────────────────┴──────────────────────────────────────┘
```

🏢 **Why even FAANG-adjacent teams avoid self-hosting databases on K8s:** stateful
operations (backups, restores, failover, version upgrades, storage resize, replication)
are *hard and unforgiving* — a mistake means data loss, not a restart. Managed services
have spent years getting this right. Run **stateless** workloads on K8s; let a managed
service (or a battle-tested **Operator** like CloudNativePG/Zalando for Postgres) own
state. The StatefulSets above are perfect for **dev/test/learning**; for prod, Verndly
points at **Supabase + Redis Cloud** (as it already does today).

### Connecting to a managed DB from the cluster
Two clean patterns:
1. Put the external `DATABASE_URL` in the Secret (Chapter 12) — done.
2. Optionally front it with an `ExternalName` Service so in-cluster config still says
   `postgres`:
   ```yaml
   apiVersion: v1
   kind: Service
   metadata: { name: postgres, namespace: verndly }
   spec:
     type: ExternalName
     externalName: db.abcdefgh.supabase.co   # CNAME to the managed host
   ```
   Now `postgres:5432` resolves to Supabase — the app config is identical to dev,
   only the Service definition differs per environment.

🧠 **The unifying idea:** keep the *application* unaware of where state lives. Whether
it's a StatefulSet pod or Supabase, the API just reads `DATABASE_URL` and connects to
`postgres`. Swap environments by swapping a Secret + a Service, never the code or image.

---

## 13.6 Storage operations you must know exist

- **Resize:** edit the PVC's `spec.resources.requests.storage` (if the StorageClass
  has `allowVolumeExpansion: true`). Disks can grow, not shrink.
- **Reclaim policy:** `Retain` (keep the disk after the PVC is deleted — safe for
  data) vs `Delete` (cloud disk is destroyed — convenient, dangerous). Databases →
  `Retain`.
- **Backups:** snapshots (`VolumeSnapshot`) or app-level dumps (`pg_dump` via a
  CronJob). ⚠️ A StatefulSet does **not** back up your data — you must.
- **`StatefulSet` deletion does NOT delete its PVCs** by default — a safety feature.
  The disks survive so you don't lose data by deleting the workload.

---

## 13.7 Mental model check

1. Why can't you use a Deployment for Postgres?
2. What does `volumeClaimTemplates` give each StatefulSet pod, and why does that matter
   on reschedule?
3. What's a headless Service and why does Postgres need one?
4. Give the senior answer to "should we run our production Postgres on Kubernetes?"

<details>
<summary>Answers</summary>

1. Deployment pods are interchangeable — random names, no stable per-pod storage, no
   ordered lifecycle. A database needs stable identity, its own persistent disk that
   follows it, and controlled ordering. StatefulSet provides all three.
2. A dedicated PVC per pod (`data-postgres-0`). On reschedule the pod re-binds to the
   *same* PVC → the *same* data. Without it, a restart could lose or mix up data.
3. A Service with `clusterIP: None`; DNS returns the pod IPs directly, giving each
   replica a stable hostname (`postgres-0.postgres...`). Stateful clustering/clients
   need to address specific members.
4. Usually **no — use a managed service (or a mature Operator).** Stateful ops
   (backups, failover, upgrades, restores) are high-stakes and hard; managed providers
   do them reliably. Keep stateless workloads on K8s; let managed services own state.
   Self-hosted StatefulSets are great for dev/learning.
</details>

---

**Next:** [Chapter 14 — Health, Resources & Autoscaling](14-health-resources-autoscaling.md)
