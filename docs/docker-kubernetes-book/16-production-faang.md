# Chapter 16 — Production: GitOps, Observability, Security & Interview Prep

> **Level 97 → 100.** Verndly runs on Kubernetes. This chapter is everything that turns
> "it runs" into "a team operates it at scale, safely, observably, and securely" — the
> bar at top-tier companies. Then a troubleshooting playbook and an interview drill set
> so you can *prove* it.

---

## 16.1 GitOps — the cluster mirrors git

You've been running `kubectl apply` / `helm upgrade` by hand. At scale that's risky:
who applied what, when, from which laptop? **GitOps** makes **git the single source of
truth**: the desired state lives in a repo, and an in-cluster agent (**Argo CD** or
**Flux**) continuously reconciles the cluster to match it — pulling changes, never
letting humans push directly.

```
   Engineer ──PR──▶ git repo (Helm/Kustomize manifests)  ── merge ──▶ main
                                                                        │
                                       Argo CD / Flux watches main ◀────┘
                                                │ continuously reconciles
                                                ▼
                                      Kubernetes cluster == git  ✅
   (drift? someone kubectl-edited prod? → the agent reverts it to match git)
```

Why FAANG teams insist on it:
- **Audited & reversible.** Every change is a PR with review + history. Rollback = git
  revert.
- **No human `kubectl` to prod.** The agent has the credentials, not laptops.
- **Drift correction.** Manual changes are reverted automatically — the cluster can't
  silently diverge from what's declared.
- **Same workflow for code and infra.** Both flow through PRs.

📦 For Verndly: CI (Chapter 7) builds `verndly-api:sha-abc123`, then opens/merges a PR
bumping `image.tag` in the Helm values. Argo CD sees the merge and rolls it out. The
loop is fully declarative end to end — exactly the reconciliation idea from Chapter 8,
now spanning git → cluster.

```yaml
# an Argo CD Application pointing at Verndly's chart
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: verndly, namespace: argocd }
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/verndly
    path: charts/verndly
    targetRevision: main
    helm: { valueFiles: [values-prod.yaml] }
  destination: { server: https://kubernetes.default.svc, namespace: verndly }
  syncPolicy:
    automated: { prune: true, selfHeal: true }   # auto-apply + revert drift
```

---

## 16.2 Observability — logs, metrics, traces

You can't operate what you can't see. The **three pillars**:

```
   LOGS    — discrete events       "what happened?"     (stdout → Loki / ELK / CloudWatch)
   METRICS — numeric time series   "how much / how fast?"(Prometheus → Grafana)
   TRACES  — request across services"where's the latency?"(OpenTelemetry → Jaeger/Tempo)
```

### Logs
Verndly's apps log to **stdout/stderr** (Chapter 5's 12-factor rule), so a node agent
(**Fluent Bit**, a DaemonSet — Chapter 10) ships them to **Loki** or **Elasticsearch**.
You query all replicas/pods centrally instead of `kubectl logs` per pod.
🏢 Use **structured (JSON) logs** with a correlation/request ID so you can trace one
user request across the web → api → db hops.

### Metrics — Prometheus + Grafana
**Prometheus** scrapes `/metrics` endpoints (pull model) and stores time series;
**Grafana** dashboards + **Alertmanager** pages you. The HPA (Chapter 14) consumes
these metrics too.
📦 Verndly already integrates **Sentry** for error tracking — complementary (error
aggregation), not a replacement for metrics. Add a Prometheus client to the NestJS API
(`/metrics`: request rate, latency histograms, error rate) and you can autoscale and
alert on **real** signals.

### The golden signals (what to actually alert on)
```
   Latency      — p50/p95/p99 response time
   Traffic      — requests/sec
   Errors       — 5xx rate, exception rate
   Saturation   — CPU/mem/connection-pool usage
```
🏢 Alert on **symptoms users feel** (p99 latency, error rate, checkout success rate),
not causes (CPU 80%). Tie alerts to **SLOs** (e.g. "99.9% of API requests < 300ms")
and spend an **error budget** rather than chasing every blip.

### Traces — OpenTelemetry
Instrument with **OpenTelemetry** to follow a single request across services. For
Verndly: trace a checkout from the web pod → API → Paystack call → DB write, and see
exactly which hop adds latency. Export to Jaeger/Tempo/Datadog.

---

## 16.3 Security hardening (defense in depth) 🏢

Each layer assumes the one outside it failed.

### Pod-level: `securityContext`
```yaml
securityContext:
  runAsNonRoot: true              # (Verndly images already use nestjs/nextjs users)
  runAsUser: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true    # app can't write its own filesystem (mount tmpfs for /tmp)
  capabilities: { drop: ["ALL"] } # drop all Linux capabilities
  seccompProfile: { type: RuntimeDefault }
```
🧠 This is Chapter 1's namespaces/cgroups/capabilities turned into declarative policy.
`readOnlyRootFilesystem` enforces the immutability you've believed in since Chapter 3.

### Network: NetworkPolicies (default-deny)
By default *any* pod can talk to *any* pod. Lock it down: deny all, then allow only
needed flows.
```yaml
# only the web pods (and the API itself) may reach the API; nothing else
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-allow, namespace: verndly }
spec:
  podSelector: { matchLabels: { app: api } }
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector: { matchLabels: { app: web } }
      ports: [{ port: 1000 }]
```
📦 For Verndly: web→api allowed, api→postgres/redis allowed, everything else denied.
Contains lateral movement if a pod is compromised. (Requires a CNI that enforces
policies, e.g. Calico/Cilium.)

### RBAC — least privilege
Bind the narrowest role to each subject. ⚠️ `get/list secrets` ≈ "read all
credentials" — grant sparingly. Use ServiceAccounts per workload, not the default.
```yaml
kind: Role          # can read only configmaps in this namespace
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get","list","watch"]
```

### Admission control & policy-as-code
**OPA Gatekeeper / Kyverno** enforce org rules at admission time: "no `:latest`
images," "every pod must set resource limits," "no privileged containers." The cluster
*refuses* non-compliant manifests — guardrails, not guidelines.

### Supply chain
- **Scan images** in CI (Trivy — Chapter 7) and continuously in the registry.
- **Sign images** with **cosign**; verify signatures at admission so only trusted,
  signed images run.
- **SBOM** (software bill of materials) for every image; track CVEs against it.
- Pin by **digest** (`@sha256:`) in prod manifests for perfect immutability.

```
   Defense in depth for Verndly:
   image scanning + signing → admission policy → non-root + readonly FS + dropped caps
        → NetworkPolicy default-deny → tight RBAC → encrypted secrets (ESO) → audit logs
```

---

## 16.4 Service mesh (when you outgrow plain Services) 🏢

At many-services scale you want mutual TLS between pods, fine-grained traffic control
(canary/A-B by header), and automatic retries/timeouts/circuit-breaking — *without*
changing app code. A **service mesh** (**Istio**, **Linkerd**) injects a sidecar proxy
into each pod and handles all of it at the network layer.

```
   without mesh:  web ─plain http─▶ api
   with mesh:     web ─[proxy]═mTLS═[proxy]─▶ api   (+ retries, timeouts, metrics, canary)
```

Gives you: **mTLS everywhere** (encrypted east-west traffic, Chapter 11), **traffic
splitting** (send 5% to v1.4.3 — true canary), **observability** (per-call metrics/
traces for free), **resilience** (retries, circuit breakers).
⚠️ A mesh adds real complexity + latency. Adopt it when you have many services and
concrete needs (mTLS mandate, canary, cross-service SLOs) — not on day one. For
Verndly's two services, it's overkill until the service count grows.

---

## 16.5 Progressive delivery (deploy like the big players)

Beyond rolling updates (Chapter 10):
- **Canary** — route a small % of traffic to the new version, watch metrics, ramp up
  if healthy, auto-rollback if error/latency rises. Tools: **Argo Rollouts**, Flagger.
- **Blue-green** — run new (green) alongside old (blue), flip traffic instantly,
  rollback = flip back.
- **Feature flags** — decouple *deploy* from *release*; ship code dark, enable per
  cohort.

```yaml
# Argo Rollouts canary (sketch) — replaces the Deployment for the api
strategy:
  canary:
    steps:
      - setWeight: 5      # 5% to new version
      - pause: { duration: 5m }   # bake; analysis can auto-abort on bad metrics
      - setWeight: 25
      - pause: { duration: 5m }
      - setWeight: 100
```
📦 For Verndly: canary the API on **checkout success rate + p95 latency**. If a deploy
dents conversion, it auto-rolls back before most users notice. This is where
observability (§16.2) and delivery meet.

---

## 16.6 Multi-environment, multi-region, cost

- **Environments:** separate namespaces or separate clusters (prod isolated from
  dev/staging). GitOps + Helm values keep them consistent.
- **Multi-region / HA:** spread nodes across availability zones (anti-affinity + PDB,
  Chapter 14); for global, run clusters per region behind global load balancing.
  Remember: the stateful tier (managed Postgres) needs its *own* HA/replication story.
- **Cost (FinOps):** right-size requests/limits (over-provisioned requests waste money
  — VPA helps), use the Cluster Autoscaler + spot/preemptible nodes for stateless
  workloads, set ResourceQuotas per namespace, and watch with Kubecost/OpenCost.
  🏢 The #1 K8s cost leak is bloated `requests` reserving capacity nobody uses.

---

## 16.7 Troubleshooting playbook (memorize this)

```
   Pod won't start / crashing
   ─────────────────────────
   kubectl get pods                      → note STATUS
   kubectl describe pod <p>              → Events (bottom) = the truth
   kubectl logs <p>                      → app error
   kubectl logs <p> --previous           → logs from the crashed instance
```

| Symptom | Likely cause | Fix / check |
|---------|--------------|-------------|
| `ImagePullBackOff` | bad tag / no registry auth / wrong arch | check image name, pull secret, `--platform` |
| `CrashLoopBackOff` | app exits on boot (bad config/missing env) | `logs --previous`; check Secret/ConfigMap |
| `Pending` | no node has the requested resources / taint | `describe pod` events; lower requests / add nodes |
| `OOMKilled` (exit 137) | memory limit too low / leak | raise `limits.memory`; profile the leak |
| Service has no endpoints | selector ≠ pod labels, or readiness failing | `get endpoints`; fix labels/readiness (Ch 11) |
| 503 through Ingress | no ready backend / wrong service port | check pods ready + Ingress `backend` port |
| Probe failing | wrong path/port, too-short delays | `describe`; align probe with the app |
| Config change ignored | env vars need a restart | `rollout restart` (Ch 12) |

```
   The universal debug loop:
   describe (events) → logs (--previous) → exec in (or kubectl debug) → get events --sort-by
```

🏢 For distroless/minimal pods with no shell, use **ephemeral debug containers**:
`kubectl debug -it <pod> --image=nicolaka/netshoot --target=api` attaches a toolbox
(curl, dig, tcpdump) sharing the pod's namespaces — debug prod without baking tools
into the image (the distroless tradeoff from Chapter 7).

---

## 16.8 The complete picture (everything, one diagram)

```
   GitHub ──CI: build+scan+sign images (Ch7)──▶ ghcr.io
      │ PR bumps image tag in Helm values
      ▼
   git main ──Argo CD reconciles (§16.1)──▶ Kubernetes cluster
   ┌───────────────────────────────────────────────────────────────────┐
   │ Ingress + TLS ─▶ web Svc ─▶ web Deploy (HPA)                        │
   │               └▶ api Svc ─▶ api Deploy (HPA, PDB, probes, limits)   │
   │                              │  initContainer wait-for-db; migrate Job(hook)│
   │                              ▼                                       │
   │                      managed Postgres (Supabase) + Redis Cloud      │
   │  securityContext + NetworkPolicy + RBAC + (optional mesh mTLS)       │
   │  Prometheus/Grafana (metrics+HPA) · Loki (logs) · OTel (traces) · Sentry│
   └───────────────────────────────────────────────────────────────────┘
```

Trace any arrow back and you'll find a chapter that explains it. That's the whole book.

---

## 16.9 Interview drills (prove you know it)

Answer aloud, then check. These are the questions that actually get asked.

**Docker**
1. Container vs VM — what's shared, what's isolated, when each? *(Ch 1)*
2. Image vs container? What's the writable layer and why is it dangerous for data? *(Ch 2/3)*
3. Why order Dockerfile instructions deps-first? Walk through cache invalidation. *(Ch 3)*
4. What does multi-stage build buy you? Show it with Verndly's API Dockerfile. *(Ch 4)*
5. CMD vs ENTRYPOINT; exec vs shell form — why does the form affect `SIGTERM`? *(Ch 4)*
6. ARG vs ENV; why is `NEXT_PUBLIC_API_URL` a build arg? Why isn't ARG a secret? *(Ch 4/7)*
7. How do two containers talk by name? Why is `localhost` wrong inside a container? *(Ch 5)*
8. Where should a database store data and why? *(Ch 5)*
9. How do you make an image small and secure? Name five levers. *(Ch 7)*
10. Why never deploy `:latest`? What do you tag instead? *(Ch 7)*

**Kubernetes**
11. State the reconciliation loop. Why does self-healing fall out of it? *(Ch 8)*
12. Walk `kubectl apply` of a Deployment to running pods, naming each component. *(Ch 9)*
13. Pod vs Deployment vs ReplicaSet — why not create bare Pods? *(Ch 10)*
14. How does a zero-downtime rolling update work? Role of readiness probes? *(Ch 10/14)*
15. Why can't a pod IP be used directly? What does a Service provide? *(Ch 11)*
16. Service types and when to use each; ClusterIP vs Ingress for Verndly. *(Ch 11)*
17. ConfigMap vs Secret; are Secrets encrypted? How do you do secrets *properly*? *(Ch 12)*
18. Why a StatefulSet (not Deployment) for Postgres? What does `volumeClaimTemplates` do? *(Ch 13)*
19. Should you run prod databases on K8s? Defend your answer. *(Ch 13)*
20. Liveness vs readiness vs startup. The classic outage when liveness checks the DB? *(Ch 14)*
21. requests vs limits; what happens at CPU vs memory limit? Why does HPA need requests? *(Ch 14)*
22. HPA vs Cluster Autoscaler; what's a PDB for? *(Ch 14)*
23. How do you run a DB migration safely on deploy with multiple replicas? *(Ch 15)*
24. What problem does Helm solve over raw YAML? *(Ch 15)*
25. What is GitOps and why prefer it over `kubectl apply` from a laptop? *(§16.1)*
26. The three pillars of observability; what should you alert on and why? *(§16.2)*
27. Name five pod/network/RBAC hardening measures. *(§16.3)*
28. When would you adopt a service mesh — and when not? *(§16.4)*
29. Canary vs blue-green vs rolling; what metric would you canary Verndly on? *(§16.5)*
30. A pod is `CrashLoopBackOff`. Walk your exact debugging steps. *(§16.7)*

**System design (the senior bar)**
31. Design Verndly's deploy from `git push` to live prod, zero downtime. Cover CI,
    registry, GitOps, migration, rollout, rollback, observability, secrets.
32. Black Friday: 50× traffic for 6 hours. What scales, in what order, and what breaks
    first? *(HPA → Cluster Autoscaler → DB connection limits / managed DB tier →
    Redis → 3rd-party rate limits.)*
33. The new API version raises p99 latency 40%. How does your pipeline catch it before
    most users do, and auto-recover? *(canary + SLO-based analysis + auto-rollback.)*

---

## 16.10 Where to go next

- **Certifications** that map to this book: **CKAD** (developer — Ch 10–15), **CKA**
  (admin — Ch 9, 13, 16), **CKS** (security — §16.3).
- **Practice:** redeploy Verndly on a managed cluster (EKS/GKE), wire real Argo CD,
  add Prometheus + Grafana, run a canary. Break things on purpose and fix them.
- **Read:** the Kubernetes docs (concepts), "Kubernetes Up & Running," the CNCF
  landscape to see where each tool fits.

---

## 16.11 You're at 100

You started not knowing what a container was. You can now: write production Dockerfiles
(you understand every line of Verndly's), build/scan/sign/ship images through CI, run
the whole stack with Compose, and deploy it to Kubernetes with self-healing, autoscaling,
zero-downtime rollouts, GitOps, observability, and security hardening — and explain the
*why* behind each.

The single idea under all of it: **declare the desired state; let the system
continuously reconcile reality to match.** Docker freezes the environment into an
image; Kubernetes keeps a fleet of those images in the shape you declared. Everything
else is detail.

Go ship Verndly. 🚀

---

← [Back to the index](README.md)
