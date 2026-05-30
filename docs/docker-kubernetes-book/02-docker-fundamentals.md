# Chapter 2 — Docker Fundamentals: Images, Containers, the Engine

> **Level 8 → 18.** You know *why* containers exist. Now the core nouns and verbs of
> Docker, the difference between an image and a container (the single most important
> distinction in this book), and your first hands-on runs.

---

## 2.1 The three nouns: image, container, registry

```
   REGISTRY (a library of images)              your machine
  ┌──────────────────────────┐            ┌────────────────────────────┐
  │  docker.io/library/...    │  pull      │  IMAGE (read-only template)│
  │  node:22-alpine     ──────┼──────────▶ │  postgres:16-alpine        │
  │  postgres:16-alpine       │            └─────────────┬──────────────┘
  │  your-org/verndly-api      │                          │ docker run
  └──────────────────────────┘                          ▼
                                            ┌────────────────────────────┐
                                            │ CONTAINER (running instance)│
                                            │  - has a writable layer     │
                                            │  - has a PID, IP, state      │
                                            └────────────────────────────┘
```

- **Image** — a *read-only* template: a filesystem snapshot + metadata (what command
  to run, which ports, env defaults). Think "a class" or "a frozen blueprint."
  Example: `node:22-alpine`, or the `verndly-api` image you build from
  `apps/api/Dockerfile`.

- **Container** — a *running (or stopped) instance* of an image, with a thin
  writable layer on top. Think "an object instantiated from the class." You can run
  10 containers from 1 image, just like `new User()` 10 times from one class.

- **Registry** — a server that stores and distributes images. Docker Hub
  (`docker.io`) is the default public one; companies run private ones (AWS ECR,
  GCP Artifact Registry, GitHub Container Registry / `ghcr.io`).

🧠 **The defining analogy:**

| Programming | Docker |
|-------------|--------|
| class / blueprint | **image** |
| object / instance | **container** |
| `new Foo()` | `docker run foo` |
| npm registry | **image registry** |
| `package.json` | **Dockerfile** (the recipe to build the image) |

If you remember only one thing from this chapter: **an image is the frozen thing,
a container is the alive thing.** People say "Docker container" when they mean
either; precision here saves you hours of confusion later.

---

## 2.2 The architecture: client, daemon, runtime

When you type `docker run`, you talk to a **client** that sends a request to a
long-running **daemon** (`dockerd`), which does the real work via lower-level
**runtimes**.

```
  $ docker run ...        (1) CLI client
        │  REST over a Unix socket (/var/run/docker.sock)
        ▼
  ┌───────────────────────────────────────────┐
  │ dockerd  (the Docker daemon / "engine")     │  (2) builds images, manages
  │   ├── manages images, networks, volumes     │      networks/volumes, pulls
  │   └── delegates container lifecycle to ↓     │
  └───────────────────────────────────────────┘
        │
        ▼
  ┌──────────────┐      ┌──────────────┐
  │  containerd  │ ───▶ │     runc     │  (3) runc actually calls the Linux
  │ (supervises  │      │ (spawns the  │      kernel: creates namespaces +
  │  containers) │      │  process)    │      cgroups, then execs your process
  └──────────────┘      └──────────────┘
```

Why care? Two reasons that pay off later:
1. **Kubernetes doesn't use the Docker daemon.** It talks straight to `containerd`
   (or another CRI runtime). The *images* you build with Docker still run fine —
   because they follow the **OCI** standard (Chapter 3). The daemon is just one tool
   for building/running; the artifact is portable.
2. The daemon runs as **root**. That's a security surface (Chapter 7) and the reason
   rootless alternatives (Podman) exist.

---

## 2.3 Your first containers (hands-on)

```bash
# Run a throwaway container; --rm deletes it on exit.
$ docker run --rm hello-world

# An interactive shell inside a minimal Linux. -i keep stdin, -t a terminal.
$ docker run --rm -it alpine:3.20 sh
/ # cat /etc/os-release        # you're "in" Alpine, sharing the host kernel
/ # exit
```

Now something closer to Verndly — run the exact Node base image its Dockerfiles use:

```bash
$ docker run --rm -it node:22-alpine node --version
v22.x.x
```

🧠 Notice you never *installed* Node 22. Docker **pulled** the `node:22-alpine`
image from Docker Hub (a registry), then ran `node --version` inside an isolated
filesystem that already contained it. That is reproducibility in action.

Run Postgres — the same image as Verndly's `docker-compose.yml`:

```bash
$ docker run --rm --name pg \
    -e POSTGRES_PASSWORD=secret \
    -p 5432:5432 \
    postgres:16-alpine
```

In another terminal:

```bash
$ docker exec -it pg psql -U postgres -c "SELECT version();"
```

You just ran a database with zero installation and zero pollution of your laptop.
Stop it (`Ctrl-C`) and it's gone — `--rm` removed it. That disposability is the point.

---

## 2.4 The container lifecycle

A container is a state machine. Knowing the states stops you from being confused
about why `docker ps` "doesn't show my container" (it exited).

```
   docker create          docker start          process ends / docker stop
        │                       │                          │
        ▼                       ▼                          ▼
  ┌──────────┐   start   ┌──────────┐   stop/exit   ┌──────────┐  rm  ┌─────────┐
  │ Created  │ ────────▶ │ Running  │ ────────────▶ │ Exited   │ ───▶ │(removed)│
  └──────────┘           └────┬─────┘               └────┬─────┘      └─────────┘
                              │ pause                    │ start
                              ▼                          ▼
                         ┌──────────┐               (back to Running)
                         │  Paused  │
                         └──────────┘

   docker run = create + start in one step.
```

⚠️ **A container lives only as long as its main process (PID 1).** If the process
exits, the container exits. This is the #1 beginner surprise:

```bash
$ docker run ubuntu          # exits instantly! ubuntu's default cmd just returns
$ docker run ubuntu sleep 30 # stays "Running" for 30s, because the process lives
```

Verndly's API container stays up because PID 1 is `node dist/main.js`, a server that
never returns. If `node` crashes, the container dies — which is exactly what we
*want*, so the orchestrator can restart it (Chapter 14).

---

## 2.5 The essential CLI verbs

You'll use these constantly. Memorize the rhythm: `docker <noun> <verb>`.

```bash
# IMAGES
docker pull node:22-alpine        # download an image
docker images                     # list local images
docker build -t verndly-api .      # build an image from a Dockerfile
docker rmi verndly-api             # remove an image
docker image prune                # delete dangling (untagged) images

# CONTAINERS
docker run ...                    # create + start
docker ps                         # list RUNNING containers
docker ps -a                      # list ALL (incl. exited)
docker logs <id>                  # see stdout/stderr
docker logs -f <id>               # ...and follow (tail)
docker exec -it <id> sh           # open a shell in a running container
docker stop <id> / start <id>     # graceful stop / start
docker rm <id>                    # delete a stopped container
docker stats                      # live CPU/mem per container

# SYSTEM
docker system df                  # disk used by images/containers/volumes
docker system prune -a            # reclaim space (careful!)
```

🧠 `exec` vs `run`: **`run` makes a new container; `exec` enters one that's already
running.** Debugging Verndly's API in prod? `docker exec -it <api> sh` to poke around
inside — don't `docker run` (that's a fresh, unrelated container).

---

## 2.6 The flags you'll type a thousand times

| Flag | Means | Verndly example |
|------|-------|----------------|
| `-d` | detached (background) | run the API without tying up your terminal |
| `-p H:C` | publish host port → container port | `-p 1000:1000` exposes the API |
| `-e K=V` | set an env var | `-e DATABASE_URL=...` |
| `--env-file` | load env vars from a file | `--env-file .env` |
| `-v src:dst` | mount a volume/bind | persist Postgres data |
| `--name` | name the container | `--name verndly-api` |
| `--rm` | auto-delete on exit | throwaway test runs |
| `-it` | interactive + TTY | get a shell |
| `--network` | attach to a network | let web reach api by name |

Example tying several together — run a detached, named API container that reads its
secrets from a file and exposes its port:

```bash
$ docker run -d --name verndly-api \
    --env-file .env \
    -p 1000:1000 \
    verndly-api:latest
$ docker logs -f verndly-api      # watch it boot
```

---

## 2.7 📦 Verndly: what you can already do

You don't have the images built yet (that's Chapter 4), but conceptually:

```
  apps/api/Dockerfile   ──build──▶  IMAGE  verndly-api:latest   ──run──▶ CONTAINER :1000
  apps/web/Dockerfile   ──build──▶  IMAGE  verndly-web:latest   ──run──▶ CONTAINER :3000
  postgres:16-alpine (pulled)       IMAGE                       ──run──▶ CONTAINER :5432
  redis:7-alpine     (pulled)       IMAGE                       ──run──▶ CONTAINER :6379
```

Four images → four (or more) containers → the whole Verndly stack, on any machine,
identically. In Chapter 6 we orchestrate all four with a single
`docker compose up`. But first we need to understand what's *inside* an image —
because that's where 90% of real Docker skill lives.

---

## 2.8 Mental model check

1. You run `docker run verndly-api` three times. How many images? How many containers?
2. `docker ps` shows nothing but you "just started a container." What happened?
3. What's the difference between `docker exec -it x sh` and `docker run -it x sh`?
4. Why doesn't Kubernetes need the Docker daemon to run images Docker built?

<details>
<summary>Answers</summary>

1. **One image, three containers.** The image is the shared read-only template.
2. Its PID-1 process exited immediately, so the container is in **Exited** state —
   visible only with `docker ps -a`. Check `docker logs <id>` for why.
3. `exec` opens a shell *inside the existing running container* (same filesystem,
   same processes); `run` spins up a *brand-new, unrelated container* from the image.
4. Images follow the **OCI** standard. Any OCI-compliant runtime (containerd, runc)
   can run them; the Docker daemon is just one builder/runner, not part of the
   artifact.
</details>

---

**Next:** [Chapter 3 — Images, Layers & the Union Filesystem](03-images-and-layers.md)
