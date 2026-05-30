# Containers to Clusters

### A no-brainer, level 0 → 100 book on Docker & Kubernetes, taught through a real production app: **Verndly**

---

This is not a lesson plan. It is a **book**. You read it front to back once, and you
walk away able to containerize an application, run it locally, ship it through CI,
and operate it on Kubernetes the way an engineer at a top-tier company would.

Every concept is taught **twice**: once as the idea (what it is, why it exists, what
breaks without it), and once **applied to Verndly** — the marketplace platform whose
source lives in this very repository. You already have the app. By the end you'll
have the infrastructure too.

---

## What is Verndly (the app we deploy)?

Verndly is a marketplace for small businesses. It is a **pnpm monorepo**:

```
verndly/
├── apps/
│   ├── api/        NestJS REST API  (Node 22, Prisma, PostgreSQL, Redis)
│   └── web/        Next.js storefront (React 18, server-rendered)
├── packages/
│   ├── types/      Shared TypeScript types (@verndly/types)
│   ├── typescript-config/
│   └── eslint-config/
├── docker-compose.yml
└── pnpm-workspace.yaml
```

Runtime dependencies:

```
                 ┌─────────────┐      ┌──────────────┐
   Browser ────▶ │  web :3000  │ ───▶ │   api :1000  │
                 │  (Next.js)  │      │   (NestJS)   │
                 └─────────────┘      └──────┬───────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                     ▼                    ▼
                  ┌───────────┐         ┌───────────┐       ┌─────────────┐
                  │ Postgres  │         │   Redis   │       │  3rd-party  │
                  │ (Supabase)│         │  (cache)  │       │ Paystack /  │
                  └───────────┘         └───────────┘       │ Cloudinary /│
                                                            │ Resend      │
                                                            └─────────────┘
```

That topology — a stateless web tier, a stateless API tier, a stateful database,
a cache, and external SaaS — is the **canonical shape** of almost every web product
on earth. Learn to ship *this* and you can ship nearly anything.

---

## How this book is structured

The book is four parts, 16 chapters, climbing from "what is a container" to
"operate a cluster at scale."

### Part I — Docker: from zero to comfortable (levels 0–35)
- **[01 — The Problem: Why Containers Exist](01-why-containers.md)**
- **[02 — Docker Fundamentals: Images, Containers, the Engine](02-docker-fundamentals.md)**
- **[03 — Images, Layers & the Union Filesystem](03-images-and-layers.md)**
- **[04 — Dockerfiles Mastered (Verndly's API & web)](04-dockerfiles-mastered.md)**
- **[05 — Running Containers: CLI, Networking, Volumes](05-running-containers.md)**

### Part II — Docker in the real world (levels 35–55)
- **[06 — Docker Compose: The Whole Verndly Stack Locally](06-docker-compose.md)**
- **[07 — Optimization, Security & Registries](07-optimization-security-registries.md)**

### Part III — Kubernetes: from zero to deploying Verndly (levels 55–85)
- **[08 — From One Host to Many: Why Kubernetes](08-why-kubernetes.md)**
- **[09 — Kubernetes Architecture](09-kubernetes-architecture.md)**
- **[10 — Pods, Deployments & Workload Controllers](10-pods-and-workloads.md)**
- **[11 — Services, Ingress & Cluster Networking](11-services-and-networking.md)**
- **[12 — Config, Secrets & Environment](12-config-and-secrets.md)**
- **[13 — Storage & StatefulSets (Postgres, Redis)](13-storage-and-statefulsets.md)**
- **[14 — Health, Resources & Autoscaling](14-health-resources-autoscaling.md)**
- **[15 — Deploying Verndly to Kubernetes (+ Helm)](15-deploying-verndly-k8s.md)**

### Part IV — FAANG-level operations (levels 85–100)
- **[16 — Production: GitOps, Observability, Security & Interview Prep](16-production-faang.md)**

---

## How to read it

- **Total beginner?** Read in order. Do not skip Part I — Kubernetes makes no sense
  until containers are second nature.
- **Know Docker, new to K8s?** Skim 01–07 for the Verndly-specific bits, then start at 08.
- **Prepping for interviews?** Read everything, then go straight to the drills at the
  end of Chapter 16.

### Conventions

| Symbol | Meaning |
|--------|---------|
| `$ command` | run this in your terminal |
| 🧠 | a concept worth pausing on |
| ⚠️ | a common mistake / footgun |
| 🏢 | how a FAANG-scale team actually does it |
| 📦 **Verndly** | applied directly to this repo |

### Prerequisites

- Comfort with a terminal and basic Linux commands (`cd`, `ls`, `cat`, pipes).
- Docker Desktop (or Docker Engine + the `docker` CLI) installed.
- For Part III: `kubectl`, plus a local cluster — **kind**, **minikube**, or Docker
  Desktop's built-in Kubernetes. We use **kind** in examples.
- The Verndly repo checked out (you're in it).

You do **not** need prior cloud, DevOps, or YAML experience. We build it from nothing.

---

> "A container is a process with a really good costume and a really small suitcase."

Turn to [Chapter 1](01-why-containers.md). Let's go.
