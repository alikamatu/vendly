# Chapter 11 — Services, Ingress & Cluster Networking

> **Level 82 → 86.** Pods are ephemeral and their IPs change constantly. So how does
> `web` reliably reach `api`, and how does the internet reach `web`? Services
> (stable virtual IPs + DNS + load balancing) and Ingress (HTTP routing + TLS).
> We wire Verndly's full traffic path.

---

## 11.1 The problem Services solve

A pod's IP is **ephemeral**. Kill a pod, the replacement gets a *new* IP. Scale up,
new IPs appear. If `web` hard-coded an api pod's IP, the first reschedule breaks it.

```
   api pods come and go:   10.244.1.7  ✝ → 10.244.2.3 (new)   ...changing constantly
   web needs ONE stable address that always routes to a healthy api pod.
```

A **Service** is that stable address. It gives a set of pods (selected by **label**) a
single virtual IP (the *ClusterIP*) and a DNS name that **never changes**, and it
**load-balances** across the currently-healthy pods behind it.

```
                       Service "api"  (stable ClusterIP 10.96.0.50, DNS: api)
                              │  selects pods with label app=api
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                  ▼
       [api pod 1]       [api pod 2]        [api pod 3]
       10.244.1.7        10.244.2.3         10.244.3.9   (IPs churn freely)

   web calls "http://api:1000" → Service → load-balanced to a healthy pod.
```

🧠 **Services select pods by label, not by IP.** Same label mechanism as Deployments
(Chapter 10). A pod is "behind" a Service if its labels match the Service's
`selector` *and* it's passing its readiness probe. Fail readiness → removed from the
Service's endpoints → no traffic. (That's the deploy-safety link from Chapter 10.)

---

## 11.2 Service types (pick by who needs to reach it)

```
   ClusterIP ──── internal only (default). web→api, api→postgres.
   NodePort ───── opens a port on every node's IP. Mostly for dev/debug.
   LoadBalancer ─ cloud provisions an external LB + public IP. (per-service)
   ExternalName ─ a CNAME alias to an external host (e.g. managed Supabase).
```

| Type | Reachable from | Verndly use |
|------|----------------|-----------|
| **ClusterIP** | inside cluster only | `api`, `postgres`, `redis` (internal) |
| **NodePort** | `<nodeIP>:<30000-32767>` | quick local testing |
| **LoadBalancer** | the internet (cloud LB) | could expose `web` directly… |
| **ExternalName** | maps to external DNS | point `postgres` at Supabase in prod |

🏢 In production you rarely give each service its own cloud LoadBalancer (expensive,
one public IP each). Instead you use **one** Ingress (§11.5) in front of everything.

---

## 11.3 📦 Verndly's internal Services

`api` needs a ClusterIP so `web` (and CronJobs) reach it as `http://api:1000`.
`web` will sit behind Ingress but still needs a Service for the Ingress to target.

```yaml
# k8s/api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api               # ← this becomes the DNS name: "api"
  namespace: verndly
spec:
  type: ClusterIP
  selector: { app: api }  # routes to pods labeled app=api (the Deployment's pods)
  ports:
    - port: 1000          # the Service's port (what callers use)
      targetPort: 1000    # the container's port
---
# k8s/web-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: verndly
spec:
  type: ClusterIP
  selector: { app: web }
  ports:
    - port: 3000
      targetPort: 3000
```

Now anywhere in the cluster, `http://api:1000` reaches a healthy API pod, and
`http://web:3000` reaches a web pod. 📦 This is the K8s version of Compose's
service-name DNS — promoted from single-host to cluster-wide and load-balanced.

---

## 11.4 Cluster DNS — how names resolve

Kubernetes runs an internal DNS server (CoreDNS). Every Service gets records:

```
   <service>                              → within the same namespace
   <service>.<namespace>                  → across namespaces
   <service>.<namespace>.svc.cluster.local→ fully-qualified

   so the API's DATABASE_URL in-cluster could be:
       postgresql://verndly:verndly@postgres.verndly.svc.cluster.local:5432/verndly
   or just (same namespace):
       postgresql://verndly:verndly@postgres:5432/verndly
```

🧠 This is why Verndly's config barely changes between Compose and K8s: in Compose the
DB host was the service name `postgres`; in K8s it's *also* `postgres` (a Service).
The connection strings are nearly identical — the platform changed, the addressing
idea didn't.

`kube-proxy` (Chapter 9) programs each node so traffic to the Service's ClusterIP is
DNAT'd and load-balanced to a real pod IP. You never see this — you just use the name.

---

## 11.5 Ingress — getting the internet *in*

ClusterIP is internal. To serve users you need an entry point. **Ingress** is an
HTTP(S) router at the edge of the cluster: it terminates TLS and routes by hostname /
path to internal Services. It needs an **Ingress Controller** (nginx, Traefik,
or a cloud one) actually running to fulfill the rules.

```
                       Internet (https://verndly.com)
                              │
                              ▼
                  ┌────────────────────────┐
                  │   Ingress Controller    │  (one cloud LoadBalancer for ALL)
                  │   + TLS termination     │
                  └───────────┬────────────┘
              host/path routing│
            ┌──────────────────┼───────────────────┐
            ▼                                       ▼
     /api/* → Service "api":1000          /* → Service "web":3000
            │                                       │
       [api pods]                              [web pods]
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: verndly
  namespace: verndly
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod   # auto TLS (Ch 16)
spec:
  ingressClassName: nginx
  tls:
    - hosts: [verndly.com, api.verndly.com]
      secretName: verndly-tls
  rules:
    - host: api.verndly.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: api, port: { number: 1000 } }
    - host: verndly.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: web, port: { number: 3000 } }
```

📦 This matches Verndly's real domains: `api.verndly.com` → the API Service,
`verndly.com` → the web Service. One public entry point, TLS handled at the edge,
internal traffic stays on ClusterIPs. The web app's `NEXT_PUBLIC_API_URL` is set to
`https://api.verndly.com` at build time (Chapter 4) so the browser hits the API
through this same Ingress.

🏢 Newer clusters increasingly use the **Gateway API** (a more expressive successor to
Ingress) — same role (edge routing/TLS), richer model. Learn Ingress first; the
concepts transfer.

---

## 11.6 The complete Verndly traffic path

```
   Browser ──https──▶ Ingress(api.verndly.com) ─▶ Service api ─▶ api pod
      │
      └─ loads page from ─▶ Ingress(verndly.com) ─▶ Service web ─▶ web pod
                                                                       │ (server-side
   in-cluster calls:                                                    │  rendering can
   web pod ─"http://api:1000"─▶ Service api ─▶ api pod                  │  also call api)
   api pod ─"postgres:5432"──▶ Service postgres ─▶ postgres pod
   api pod ─"redis:6379"─────▶ Service redis ─▶ redis pod
   CronJob ─"http://api:1000/cron/..."▶ Service api ─▶ api pod
```

Two distinct planes, and getting them straight is the whole game:
- **North-south** (in/out of the cluster): browser ↔ Ingress ↔ Services. Uses public
  DNS + TLS.
- **East-west** (pod-to-pod inside): Service names over ClusterIP. No public DNS, no TLS
  required (until you add a mesh, Chapter 16).

---

## 11.7 Testing Services without an Ingress (local dev)

On kind you may not have an Ingress controller yet. `port-forward` tunnels a Service
to your laptop:

```bash
$ kubectl port-forward svc/api 1000:1000 -n verndly
# now http://localhost:1000 hits the api Service inside the cluster

$ kubectl port-forward svc/web 3000:3000 -n verndly
# http://localhost:3000 → the storefront
```

To do Ingress locally on kind, install the nginx ingress controller:
```bash
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

Debugging Services:
```bash
kubectl get svc -n verndly                 # ClusterIPs + ports
kubectl get endpoints api -n verndly       # which pod IPs are behind it (empty = bad selector!)
kubectl describe svc api -n verndly
```

⚠️ **#1 Service bug: empty Endpoints.** If `kubectl get endpoints api` is empty, your
Service `selector` doesn't match any ready pod's labels — or no pod is passing
readiness. Traffic goes nowhere. Always check endpoints first.

---

## 11.8 Mental model check

1. Why can't `web` just connect to an api pod's IP directly?
2. What two conditions must a pod meet to receive traffic from a Service?
3. ClusterIP vs LoadBalancer vs Ingress — when do you use each for Verndly?
4. `kubectl get endpoints api` is empty though pods are Running. What's wrong?

<details>
<summary>Answers</summary>

1. Pod IPs are ephemeral — they change on every reschedule/scale. A Service provides a
   stable virtual IP + DNS name and load-balances across the current healthy pods.
2. Its labels match the Service's `selector`, **and** it's passing its readiness probe
   (so it's in the Service's endpoint list).
3. **ClusterIP** for internal traffic (api, postgres, redis). **Ingress** (backed by
   one LoadBalancer) for public HTTP(S) into web + api with host/path routing and TLS.
   A per-service **LoadBalancer** only when you truly need a dedicated external IP.
4. The Service `selector` doesn't match the pods' labels (or no pod passes readiness).
   Fix the selector/labels or the readiness probe; endpoints will populate.
</details>

---

**Next:** [Chapter 12 — Config, Secrets & Environment](12-config-and-secrets.md)
