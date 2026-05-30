# Chapter 1 — The Problem: Why Containers Exist

> **Level 0 → 8.** Before you learn *how* Docker works, you must feel *why* it had to
> be invented. We'll do that using a real bug class you've already hit: "it works on
> my machine."

---

## 1.1 The story: shipping Verndly without containers

Imagine you just finished building Verndly on your laptop. It runs beautifully:

```bash
$ pnpm install
$ pnpm --filter @verndly/api dev      # API on :1000
$ pnpm --filter @verndly/web dev      # web on :3000
```

Now your teammate pulls the repo. Their machine has Node 18 (you have Node 22).
`prisma generate` produces a slightly different client. `sharp` (Verndly's image
library) ships **native binaries compiled per-OS** — yours are macOS arm64, theirs
are Linux x64. The API crashes on boot with a cryptic `Error: Could not load the
"sharp" module`. Three hours gone.

Then you deploy to a server. The server has:
- A different OS (Ubuntu vs. your macOS).
- A different OpenSSL version (Prisma's query engine links against it — Verndly's
  Dockerfile installs `openssl` precisely for this reason).
- No Redis. No environment variables. A different `PATH`.

This is the **environment drift problem**, and it has plagued software since forever:

```
   Your laptop          Teammate's laptop          Production server
 ┌───────────────┐    ┌────────────────────┐    ┌────────────────────┐
 │ macOS arm64   │    │ Windows / WSL      │    │ Ubuntu 22.04 x64   │
 │ Node 22       │ ≠  │ Node 18            │ ≠  │ Node 20            │
 │ openssl 3.x   │    │ openssl 1.1        │    │ openssl 3.0        │
 │ Redis running │    │ no Redis           │    │ managed Redis      │
 │ env vars set  │    │ env vars missing   │    │ different env vars │
 └───────────────┘    └────────────────────┘    └────────────────────┘
        ✅                    💥                          💥
```

Every box is a different universe. Code that assumes one universe breaks in another.

---

## 1.2 The fixes people tried before containers (and why they fell short)

### Attempt 1: "Just write a setup doc"
A README that says "install Node 22, openssl 3, Redis 7, set these 14 env vars."
Humans skip steps. Versions drift. The doc rots. **Not reproducible.**

### Attempt 2: Configuration management (Ansible, Chef, Puppet)
Scripts that *converge* a server toward a desired state. Better — but they mutate
long-lived machines. Run the script twice and you might get different results
(not **idempotent** in practice). The server accumulates cruft over months
("snowflake servers"). **Reproducible-ish, but slow and fragile.**

### Attempt 3: Virtual machines (VMware, VirtualBox, EC2 AMIs)
Ship the *entire OS* as an image. Now the environment really is identical! This
actually works — it's how the cloud was built. But:

```
  A Virtual Machine bundles a WHOLE guest OS per app:

  ┌─────────────────────────────────────────────────────┐
  │ Physical server / cloud host                         │
  │  ┌───────────────┐ ┌───────────────┐ ┌────────────┐ │
  │  │  Guest OS      │ │  Guest OS      │ │ Guest OS   │ │  ← each ~1–10 GB
  │  │  (kernel+libs) │ │  (kernel+libs) │ │(kernel+...)│ │  ← boots in minutes
  │  │  Verndly API    │ │  Verndly web    │ │  Postgres  │ │
  │  └───────────────┘ └───────────────┘ └────────────┘ │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │            Hypervisor (VMware/KVM)               │ │
  │  └─────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────┘
```

A VM virtualizes **hardware**: each one runs a full guest kernel. That's heavy —
gigabytes of RAM and disk per app, slow boots, you can fit maybe a handful on a host.

---

## 1.3 The insight: you don't need a whole OS, just isolation

Here's the leap. On Linux, **all your processes already share one kernel.** What
actually differs between "my machine" and "the server" is mostly *user space*: the
files, libraries, the version of Node, the env vars — not the kernel itself.

So what if we could give a process its **own private view** of:
- the **filesystem** (its own `/usr`, `/lib`, its own Node binary),
- the **network** (its own ports, its own IP),
- the **process table** (it thinks it's PID 1, can't see other processes),
- **resource limits** (this process gets max 512 MB RAM, 0.5 CPU),

…while still sharing the **host's kernel**? No guest OS. No hypervisor. Just a
normal Linux process wearing a costume that makes it *believe* it has the machine
to itself.

That is a **container**.

```
  Containers share ONE host kernel — only user space is isolated:

  ┌─────────────────────────────────────────────────────┐
  │ Host OS (one shared Linux kernel)                    │
  │  ┌───────────┐ ┌───────────┐ ┌───────────┐           │
  │  │ Verndly API│ │ Verndly web│ │ Postgres  │           │  ← each ~tens of MB
  │  │ +its libs │ │ +its libs │ │ +its libs │           │  ← starts in ms
  │  └───────────┘ └───────────┘ └───────────┘           │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │      Container runtime (Docker / containerd)     │ │
  │  └─────────────────────────────────────────────────┘ │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │                 Shared Linux kernel              │ │  ← namespaces + cgroups
  │  └─────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────┘
```

🧠 **The whole idea in one sentence:** A container is a *process* that the Linux
kernel has tricked into thinking it owns a clean, minimal machine — by hiding
everything else from it. It is **not** a tiny VM.

---

## 1.4 The two kernel features that make it possible

You don't need to memorize these, but knowing they exist demystifies the magic.

### Namespaces — "what a process can *see*"
The kernel can give a process a private view of a global resource. There are
several namespace types; the ones that matter most:

| Namespace | Isolates | Effect on a Verndly container |
|-----------|----------|------------------------------|
| **mount (mnt)** | filesystem mounts | the API sees only its own `/`, not your laptop |
| **PID** | process IDs | `node dist/main.js` runs as PID 1 inside |
| **network (net)** | interfaces, ports, routes | the API has its own `:1000`, its own IP |
| **UTS** | hostname | container has its own hostname |
| **IPC** | shared memory | can't touch other apps' shared memory |
| **user** | UID/GID mapping | root *inside* can map to non-root *outside* |

### Cgroups (control groups) — "what a process can *use*"
Namespaces hide things; **cgroups limit** things. They cap and meter CPU, memory,
disk I/O, and network for a group of processes. This is how you say "the Verndly API
container may use at most 512 MB" — and the kernel enforces it. When we get to
Kubernetes resource limits (Chapter 14), they bottom out in cgroups.

```
  namespaces  →  ISOLATION   ("you can't see the rest of the machine")
  cgroups     →  LIMITS      ("you can't hog the whole machine")
            together = a container
```

⚠️ **Because containers share the host kernel, they are Linux-flavored.** On macOS
and Windows, Docker quietly runs a tiny Linux VM and puts your containers inside
*it*. So "containers are lightweight" is true on Linux hosts; on a Mac there's one
small VM under everything. (This is why Verndly's images use `node:22-alpine` — a
Linux base — even though you build them on a Mac.)

---

## 1.5 What a container gives you, concretely

1. **Reproducibility** — the image contains Node 22, openssl, sharp's Linux
   binaries, *everything*. The same image runs identically on your Mac, your
   teammate's Windows box, CI, and production. "Works on my machine" → "works in
   the image, which is everywhere."

2. **Isolation** — Verndly's API and Postgres can each demand a different libc
   version and never collide.

3. **Density & speed** — start in milliseconds, pack hundreds per host. This is
   what makes Kubernetes autoscaling (spin up 20 API replicas in seconds) possible.

4. **Immutability** — you don't patch a running container; you build a new image
   and replace it. No more snowflake servers. This unlocks safe rollbacks.

5. **Portability** — the image is just a tarball of layers + metadata (the OCI
   standard, Chapter 3). Any compliant runtime can run it: Docker, containerd,
   Podman, Kubernetes.

---

## 1.6 📦 Verndly: the "before" state you're escaping

Look at where Verndly deploys *today* (from the repo's `render.yaml` and `vercel.json`):

- The Next.js **web** app → Vercel.
- The NestJS **API** → Render.
- Postgres → Supabase. Redis → Redis Cloud.

That works, but each platform has its own quirky build config. The `render.yaml`
build command is a fragile incantation of `pnpm install --filter`, `prisma
generate`, and `nest build`. When it broke, you debugged *Render's* environment,
not a thing you control.

With containers, **you** define the environment once, in a `Dockerfile`, and it's
the same artifact on every platform — including the Kubernetes cluster we'll build
in Part III. You already took the first step: this repo now has
`apps/api/Dockerfile`, `apps/web/Dockerfile`, and `docker-compose.yml`. Over the
next chapters we'll understand every line of them.

---

## 1.7 Mental model check

Answer these before moving on (answers below):

1. True/false: a container includes its own Linux kernel.
2. What kernel feature stops the Verndly API container from using all the host's RAM?
3. Why does Verndly's Dockerfile bother to `apk add openssl`?
4. Why is "works on my machine" largely solved by an image but not by a README?

<details>
<summary>Answers</summary>

1. **False.** It shares the host kernel; only user space is isolated.
2. **cgroups** (memory limit). Namespaces only hide things; cgroups cap usage.
3. Prisma's query engine dynamically links against OpenSSL at runtime; the slim
   `node:22-alpine` base doesn't ship it, so we add it or Prisma fails to start.
4. An image *is* the environment, byte for byte, and runs identically everywhere.
   A README is instructions a human (or another machine) must re-execute, and any
   drift — Node version, missing package — silently changes the result.
</details>

---

**Next:** [Chapter 2 — Docker Fundamentals: Images, Containers, the Engine](02-docker-fundamentals.md)
