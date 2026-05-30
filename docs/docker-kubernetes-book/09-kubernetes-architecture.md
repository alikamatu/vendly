# Chapter 9 — Kubernetes Architecture

> **Level 72 → 77.** What a cluster actually *is*: the control plane, the worker
> nodes, and the components that turn your declared YAML into running containers.
> Plus `kubectl`, the API-server-centric mental model, and spinning up a local
> cluster so the next chapters are hands-on with Verndly.

---

## 9.1 A cluster = control plane + worker nodes

```
   ┌──────────────────────── CONTROL PLANE (the brain) ───────────────────────┐
   │                                                                            │
   │   ┌────────────┐   ┌──────────┐   ┌───────────────────┐  ┌─────────────┐  │
   │   │ API server │◀─▶│   etcd    │   │ controller-manager │  │  scheduler  │  │
   │   │ (the only  │   │ (the DB:  │   │ (runs reconcile    │  │ (places pods│  │
   │   │  door in)  │   │  cluster  │   │  loops)            │  │  on nodes)  │  │
   │   └─────┬──────┘   │  state)   │   └───────────────────┘  └─────────────┘  │
   └─────────┼──────────└──────────┘──────────────────────────────────────────┘
             │ (every component talks ONLY through the API server)
             ▼
   ┌──────────────── WORKER NODES (the muscle — run your containers) ──────────┐
   │   node-1                         node-2                                    │
   │   ┌──────────┐ ┌─────────────┐   ┌──────────┐ ┌─────────────┐              │
   │   │ kubelet  │ │ kube-proxy  │   │ kubelet  │ │ kube-proxy  │              │
   │   └────┬─────┘ └─────────────┘   └────┬─────┘ └─────────────┘              │
   │   ┌────▼───────────────────┐     ┌────▼───────────────────┐                │
   │   │ container runtime       │     │ container runtime       │  (containerd)  │
   │   │  [api pod] [web pod]    │     │  [api pod] [redis pod]  │                │
   │   └────────────────────────┘     └────────────────────────┘                │
   └───────────────────────────────────────────────────────────────────────────┘
```

- **Control plane** = the brain. Makes global decisions (scheduling, reconciliation).
  On managed K8s (EKS/GKE/AKS) the cloud runs this for you.
- **Worker nodes** = the muscle. Machines (VMs/bare metal) that actually run your
  pods. You (or autoscaling) add/remove nodes for capacity.

---

## 9.2 Control plane components (what each one does)

### `kube-apiserver` — the front door
The **only** component anything talks to. `kubectl`, controllers, the scheduler, the
kubelets — all read/write cluster state *through the API server*. It validates
requests, applies RBAC, and persists state to etcd.
🧠 **Everything is an API call.** "Create a Deployment" = `POST` an object to the API
server. This uniformity is why the same `kubectl`/YAML works for every resource type.

### `etcd` — the cluster's source of truth
A distributed, consistent key-value store holding the **entire desired + observed
state** (every object you create). If etcd is the database, the API server is the
only app allowed to touch it. Back up etcd and you can rebuild the cluster's brain.

### `kube-scheduler` — the placement engine
Watches for Pods with no assigned node and picks the best node for each, considering
resource `requests`, affinity/anti-affinity, taints/tolerations, and spread. It
doesn't *run* the pod — it just writes "this pod goes on node-2"; the kubelet there
does the rest.

### `kube-controller-manager` — the reconcilers
Runs the built-in controllers — the reconciliation loops from Chapter 8. The
Deployment controller, ReplicaSet controller, Node controller, Job controller, etc.,
each watching "their" objects and driving reality toward desired state.

### `cloud-controller-manager` (managed clusters)
Integrates with the cloud: provisions load balancers for Services, attaches disks for
volumes, manages node lifecycle.

---

## 9.3 Worker node components

### `kubelet` — the node agent
On every node. Watches the API server for "pods assigned to me," then tells the
**container runtime** to pull images and start containers. Reports pod/node health
back up. Runs the **probes** (Chapter 14). It is the hands that build what the brain
decides.

### Container runtime (`containerd`)
The thing that actually runs containers — via the **CRI** (Container Runtime
Interface). 🧠 **This is the payoff of OCI (Chapter 3):** the images you built with
Docker run here unchanged, because they're OCI images and containerd is an OCI
runtime. Kubernetes deprecated the Docker *daemon* shim years ago, but your Docker-built
*images* were never the issue — they're standard.

### `kube-proxy` — node networking
Programs the node's network rules (iptables/IPVS) so that traffic to a **Service**'s
virtual IP gets load-balanced to the right pod IPs. The plumbing behind Chapter 11.

### CNI plugin (Calico, Cilium, Flannel…)
Implements the cluster network so **every pod gets its own IP** and any pod can reach
any other pod across nodes. Also enforces **NetworkPolicies** (Chapter 16).

---

## 9.4 The end-to-end flow: `kubectl apply` → running Verndly API

Trace one command. This single walkthrough explains the whole system:

```
  1. You:  kubectl apply -f api-deployment.yaml   (desired: 3 api replicas, v1.4.2)
                │
                ▼
  2. API server validates + RBAC-checks, writes the Deployment object to etcd.
                │
                ▼
  3. Deployment controller sees a new Deployment → creates a ReplicaSet (desired=3).
                │
                ▼
  4. ReplicaSet controller sees 0 pods exist but 3 desired → creates 3 Pod objects
     (still unscheduled), writes them to etcd.
                │
                ▼
  5. Scheduler sees 3 Pods with no node → assigns each to a node (writes nodeName).
                │
                ▼
  6. kubelet on each chosen node sees "a pod is mine" → tells containerd to pull
     ghcr.io/.../verndly-api:1.4.2 and start the container; runs its probes.
                │
                ▼
  7. kubelet reports status back to the API server → etcd now shows 3 Running pods.
     observed == desired ✅   (and the loop keeps watching forever)
```

⚠️ Note **you never SSH into a node** or run `docker run` by hand. You change the
*desired state* via the API server; controllers + kubelets make it real. If a pod
dies at step 7, the ReplicaSet controller notices observed(2) ≠ desired(3) and loops
back to step 4. That's self-healing, falling out of the architecture for free.

---

## 9.5 `kubectl` — your remote control for the API server

`kubectl` is just a friendly HTTP client for the API server. The grammar:

```bash
kubectl <verb> <resource> <name> [flags]
```

```bash
# read
kubectl get pods                         # list pods in the current namespace
kubectl get pods -o wide                 # ...with node + IP
kubectl get deployments,svc,ingress      # multiple kinds at once
kubectl describe pod <name>              # detailed events + status (your #1 debug tool)
kubectl logs -f <pod>                    # stream logs (like docker logs)
kubectl get events --sort-by=.lastTimestamp   # what just happened in the cluster

# change
kubectl apply -f manifest.yaml           # declaratively create/update (idempotent)
kubectl delete -f manifest.yaml          # remove what the file declares
kubectl scale deploy/api --replicas=5    # imperative scale
kubectl rollout status deploy/api        # watch a rollout
kubectl rollout undo deploy/api          # roll back

# interact
kubectl exec -it <pod> -- sh             # shell into a pod (like docker exec)
kubectl port-forward svc/api 1000:1000   # tunnel a cluster service to localhost
kubectl get pods -n kube-system          # -n selects a namespace
```

🧠 **Declarative (`apply -f`) over imperative (`create`, `scale`).** Keep your YAML in
git; `kubectl apply` reconciles the cluster to match it. This is GitOps' foundation
(Chapter 16). Use imperative commands for quick experiments and debugging only.

### kubeconfig
`kubectl` finds clusters + credentials in `~/.kube/config` (or `$KUBECONFIG`).
`kubectl config get-contexts` / `use-context` switches between clusters (local, staging,
prod). ⚠️ Always check `kubectl config current-context` before destructive commands —
running `delete` against prod because you forgot to switch is a classic incident.

---

## 9.6 Namespaces — logical partitions

A **namespace** scopes names and lets you group/isolate resources (per team, per env,
per app). Think folders for cluster objects.

```bash
kubectl create namespace verndly
kubectl get pods -n verndly
kubectl config set-context --current --namespace=verndly   # make it the default
```

📦 We'll put all of Verndly in a `verndly` namespace so it's cleanly isolated and easy
to tear down. RBAC, ResourceQuotas, and NetworkPolicies (Chapter 16) often apply
per-namespace.

---

## 9.7 Get a cluster running locally (so the rest is hands-on)

You need a real cluster to follow Chapters 10–15. Three easy local options:

| Tool | Best for | Start |
|------|----------|-------|
| **kind** (Kubernetes-in-Docker) | CI, fast throwaway clusters | `kind create cluster --name verndly` |
| **minikube** | full-featured local dev (addons, dashboard) | `minikube start` |
| **Docker Desktop** | one checkbox if you already have it | Settings → Kubernetes → Enable |

We use **kind** (it runs nodes *as Docker containers* — fittingly, the whole control
plane in containers):

```bash
$ kind create cluster --name verndly
$ kubectl cluster-info --context kind-verndly
$ kubectl get nodes
NAME                    STATUS   ROLES           AGE   VERSION
verndly-control-plane    Ready    control-plane   30s   v1.31.x
```

To run *your own* images (like `verndly-api`) in kind without a registry, load them in:
```bash
$ docker build -f apps/api/Dockerfile -t verndly-api:dev .
$ kind load docker-image verndly-api:dev --name verndly      # push into the kind nodes
```
(In real clusters you'd pull from `ghcr.io` instead — Chapter 7's CI output.)

---

## 9.8 The "everything is an object" model

Every K8s resource — Pod, Deployment, Service, ConfigMap, even a Node — is an
**object** with the same skeleton. Learn it once, read any manifest:

```yaml
apiVersion: apps/v1        # which API group + version defines this kind
kind: Deployment           # the type of object
metadata:
  name: api                # its name (unique within namespace + kind)
  namespace: verndly
  labels: { app: api }     # key/value tags used for grouping + selection
spec:                      # DESIRED state — what YOU declare
  replicas: 3
  # ...
status:                    # OBSERVED state — what the CONTROLLER fills in (read-only)
  readyReplicas: 3
```

🧠 The eternal split: **you write `spec` (desired); controllers write `status`
(observed); reconciliation drives status → spec.** Every chapter from here is just
new `kind`s with new `spec` fields — the model never changes.

---

## 9.9 Mental model check

1. Why is the API server described as "the only door in"?
2. The scheduler assigns a pod to node-2 but the container never starts. Which
   component is responsible for actually starting it, and where would you look?
3. Kubernetes "removed Docker" — does that mean your Docker-built Verndly images stop
   working? Why/why not?
4. In a manifest, who writes `spec` and who writes `status`?

<details>
<summary>Answers</summary>

1. Every component (kubectl, scheduler, controllers, kubelets) reads/writes cluster
   state *only* through the API server, which validates, authorizes, and persists to
   etcd. Nothing touches etcd directly. It's the single, audited entry point.
2. The **kubelet** on node-2 starts containers (via the container runtime). Look at
   `kubectl describe pod <name>` events and `kubectl logs`, and check the kubelet /
   image pull (e.g. `ImagePullBackOff`).
3. They keep working. K8s dropped the Docker *daemon* shim, not OCI images. Your
   images are OCI-standard and run on containerd unchanged (Chapter 3 §3.7).
4. **You** write `spec` (desired state); **controllers** write `status` (observed).
   You never hand-edit `status`.
</details>

---

**Next:** [Chapter 10 — Pods, Deployments & Workload Controllers](10-pods-and-workloads.md)
