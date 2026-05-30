# Chapter 12 — Config, Secrets & Environment

> **Level 86 → 89.** Verndly's API reads ~15 env vars — `DATABASE_URL`, `JWT_SECRET`,
> `PAYSTACK_SECRET_KEY`, `REDIS_URL`, and more. In Compose these lived in `.env`. In
> Kubernetes they become **ConfigMaps** (non-secret) and **Secrets** (sensitive),
> injected into pods. We wire Verndly's full config, then cover the real-world
> hardening: external secret managers and encryption.

---

## 12.1 Why config is a first-class object

Twelve-factor config rule: **config lives in the environment, not the image.** Same
image, different config per environment (dev/staging/prod). Kubernetes makes config a
*versioned cluster object* you can manage, audit, and roll independently of code.

```
   ONE image  ghcr.io/.../verndly-api:1.4.2
        │
        ├─ + dev ConfigMap/Secret    → dev pods
        ├─ + staging ConfigMap/Secret→ staging pods
        └─ + prod ConfigMap/Secret   → prod pods
   (the bits never change; only the injected config does)
```

Two object types:
- **ConfigMap** — non-sensitive key/value config (`NODE_ENV`, `FRONTEND_URL`,
  `NEXT_PUBLIC_API_URL`).
- **Secret** — sensitive values (`JWT_SECRET`, `DATABASE_URL`, API keys). Same shape,
  but stored base64-encoded and treated specially (RBAC, optional encryption).

---

## 12.2 ConfigMap — Verndly's non-secret config

```yaml
# k8s/api-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: verndly
data:
  NODE_ENV: "production"
  PORT: "1000"
  FRONTEND_URL: "https://verndly.com"
  REDIS_URL: "redis://redis:6379"          # the redis Service name (Ch 11)
```

📦 Note `REDIS_URL` uses the cluster Service name `redis` — the same value style as
Compose. Non-secret, so it's fine in a ConfigMap (and in git).

---

## 12.3 Secret — Verndly's sensitive values

```yaml
# k8s/api-secrets.yaml  (⚠️ do NOT commit real values — see §12.7)
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: verndly
type: Opaque
stringData:                                # stringData: plain text; K8s base64s it
  DATABASE_URL: "postgresql://verndly:verndly@postgres:5432/verndly?schema=public"
  DIRECT_URL:   "postgresql://verndly:verndly@postgres:5432/verndly?schema=public"
  JWT_SECRET:   "a-long-random-production-secret"
  PAYSTACK_SECRET_KEY: "sk_live_xxx"
  PAYSTACK_PUBLIC_KEY: "pk_live_xxx"
  CLOUDINARY_API_KEY:    "xxx"
  CLOUDINARY_API_SECRET: "xxx"
  RESEND_API_KEY: "re_xxx"
  CRON_SECRET:    "another-long-random-secret"
```

Or create it imperatively (keeps secrets out of files entirely):
```bash
$ kubectl create secret generic api-secrets -n verndly \
    --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
    --from-literal=DATABASE_URL="postgresql://..." \
    --from-literal=PAYSTACK_SECRET_KEY="sk_live_xxx"
```

⚠️ **K8s Secrets are base64-encoded, NOT encrypted by default.** Base64 is *encoding*,
not security — anyone with read access (or raw etcd access) can decode them. Treat
Secrets as "slightly protected env vars" until you add the real protections in §12.7.

---

## 12.4 Injecting config into pods (the two patterns)

### Pattern A — as environment variables (what Verndly uses)
`envFrom` dumps every key in a ConfigMap/Secret into the container's environment —
exactly what the NestJS app expects (`process.env.DATABASE_URL`, etc.):

```yaml
# inside the api Deployment's container spec (Ch 10):
envFrom:
  - configMapRef: { name: api-config }
  - secretRef:    { name: api-secrets }
```

Or cherry-pick individual keys:
```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef: { name: api-secrets, key: JWT_SECRET }
  - name: NODE_ENV
    valueFrom:
      configMapKeyRef: { name: api-config, key: NODE_ENV }
```

🧠 `envFrom` is the K8s equivalent of Compose's `env_file` / `--env-file`. The app
code doesn't change at all — it still just reads `process.env`. That's the point:
the *platform* changed, not the application.

### Pattern B — mounted as files (volume)
For config files (nginx.conf, TLS certs) or apps that read a config *file*:

```yaml
volumes:
  - name: cfg
    configMap: { name: api-config }
containers:
  - name: api
    volumeMounts:
      - { name: cfg, mountPath: /etc/verndly, readOnly: true }
# → each key becomes a file: /etc/verndly/NODE_ENV, etc.
```

🧠 **A mounted ConfigMap can update *live*** — change the ConfigMap and the files in
the pod refresh (after a short delay), no restart needed. Env vars (Pattern A) are set
at container start and **do not** update until the pod restarts. Verndly uses env vars,
so a config change requires a rollout (`kubectl rollout restart deploy/api`).

---

## 12.5 📦 The web app's config

The web Deployment needs `NEXT_PUBLIC_API_URL` at *runtime* too (for SSR calls), but
remember it was already **baked into the client bundle at build time** (Chapter 4).
So the build-arg and the runtime env must agree:

```yaml
# k8s/web-config.yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: web-config, namespace: verndly }
data:
  NODE_ENV: "production"
  PORT: "3000"
  NEXT_PUBLIC_API_URL: "https://api.verndly.com"   # MUST match the build-arg used in CI
```

⚠️ If CI built the web image with `--build-arg NEXT_PUBLIC_API_URL=https://api.verndly.com`
but the ConfigMap says something else, the browser bundle and SSR will disagree.
Keep them in lockstep (a Helm value drives both — Chapter 15).

---

## 12.6 Config changes & rollouts

Because Verndly injects via env vars, updating config means restarting pods:

```bash
$ kubectl apply -f k8s/api-config.yaml          # change a value
$ kubectl rollout restart deploy/api -n verndly  # roll pods to pick it up
```

🏢 A common trick: add a checksum of the ConfigMap/Secret as a pod annotation (Helm
does this with `checksum/config`). When the config changes, the checksum changes, the
pod template changes, and K8s automatically does a rolling restart — no manual
`rollout restart`. We'll see it in the Helm chapter.

---

## 12.7 Doing secrets *properly* (the FAANG part) 🏢

Plain Secrets are the floor, not the ceiling. Production hardening:

1. **Encrypt etcd at rest.** Enable `EncryptionConfiguration` (or use a KMS provider:
   AWS KMS, GCP KMS) so Secrets aren't plaintext in etcd. Managed clusters often offer
   this as a toggle.

2. **Lock down RBAC.** `get/list secrets` is effectively "read all credentials."
   Grant it to as few subjects as possible (Chapter 16).

3. **External secret managers** — the real standard. Keep secrets in **HashiCorp
   Vault / AWS Secrets Manager / GCP Secret Manager** and sync them in:
   - **External Secrets Operator (ESO):** an `ExternalSecret` object pulls from the
     manager and materializes a native K8s Secret, kept in sync.
   - **Secrets Store CSI Driver:** mounts secrets straight from the manager as files.

   ```yaml
   apiVersion: external-secrets.io/v1
   kind: ExternalSecret
   metadata: { name: api-secrets, namespace: verndly }
   spec:
     secretStoreRef: { name: aws-secrets, kind: ClusterSecretStore }
     target: { name: api-secrets }        # creates/refreshes this K8s Secret
     data:
       - secretKey: JWT_SECRET
         remoteRef: { key: prod/verndly/JWT_SECRET }
       - secretKey: PAYSTACK_SECRET_KEY
         remoteRef: { key: prod/verndly/PAYSTACK_SECRET_KEY }
   ```

4. **GitOps-safe secrets.** You want everything in git (Chapter 16) — but never
   plaintext secrets. **Sealed Secrets** (Bitnami) encrypts a Secret so only the
   in-cluster controller can decrypt it; the encrypted blob is safe to commit. ESO +
   a manager is the more common large-scale answer.

5. **Rotate.** Short-lived, rotated credentials beat long-lived ones. ESO + a manager
   makes rotation a manager-side change that propagates automatically.

```
   ❌ secret value committed to git in plaintext
   ⚠️ kubectl-created Secret (base64, unencrypted etcd)         ← dev/floor
   ✅ etcd encryption + tight RBAC                               ← baseline prod
   ✅✅ External Secrets Operator + Vault/AWS SM + rotation       ← FAANG standard
```

---

## 12.8 📦 Verndly config inventory

| Var | Type | Where | Note |
|-----|------|-------|------|
| `NODE_ENV`, `PORT`, `FRONTEND_URL` | ConfigMap | api-config | non-secret |
| `REDIS_URL` | ConfigMap | api-config | Service-name URL |
| `NEXT_PUBLIC_API_URL` | ConfigMap | web-config | also a build-arg! keep in sync |
| `DATABASE_URL`, `DIRECT_URL` | Secret | api-secrets | DB creds |
| `JWT_SECRET`, `CRON_SECRET` | Secret | api-secrets | rotate these |
| `PAYSTACK_*`, `CLOUDINARY_*`, `RESEND_API_KEY` | Secret | api-secrets | 3rd-party keys |

In prod, `DATABASE_URL`/`REDIS_URL` point at **managed Supabase / Redis Cloud** (an
`ExternalName` Service or just the external host in the Secret), not in-cluster pods.

---

## 12.9 Mental model check

1. ConfigMap vs Secret — what's the real difference, and is a Secret encrypted?
2. You change `api-config` but the pods still use the old value. Why, and how do you
   apply it?
3. Why must `NEXT_PUBLIC_API_URL` be consistent between CI build-arg and the runtime
   ConfigMap?
4. Your security team forbids plaintext secrets in git but wants full GitOps. What's
   the standard solution?

<details>
<summary>Answers</summary>

1. Both store key/values; Secrets are for sensitive data (base64-encoded, RBAC-guarded,
   can be encrypted at rest). **By default a Secret is only base64-encoded, not
   encrypted** — enable etcd encryption / a KMS for real protection.
2. Env vars (`envFrom`) are read at container start and don't refresh live. Run
   `kubectl rollout restart deploy/api` so new pods pick up the change. (Mounted
   ConfigMap *files* would refresh without a restart.)
3. `NEXT_PUBLIC_*` is inlined into the browser bundle at build time; SSR/runtime uses
   the env too. If they differ, client and server disagree about the API origin.
4. **External Secrets Operator + a secret manager (Vault/AWS SM/GCP SM)**, or
   **Sealed Secrets** for encrypted-at-rest blobs that are safe to commit. Never commit
   plaintext.
</details>

---

**Next:** [Chapter 13 — Storage & StatefulSets (Postgres, Redis)](13-storage-and-statefulsets.md)
