# Chapter 5 — Running Containers: CLI, Networking, Volumes

> **Level 42 → 52.** An image is inert until you run it. This chapter is the
> operational core of Docker: ports, container-to-container networking, persistent
> storage, env/secrets, logs, and resource limits — all the things you need before a
> multi-service app like Verndly works end-to-end.

---

## 5.1 Networking #1: publishing ports to the host

By default a container's ports are reachable only *inside* its network. To reach the
Verndly API from your browser, you **publish** a port to the host with `-p HOST:CONTAINER`:

```bash
$ docker run -d --name api -p 1000:1000 verndly-api
#                              │     └ port inside the container (the app listens here)
#                              └ port on your laptop (what you hit in the browser)
```

```
   Your laptop                    Container
   localhost:1000  ──forwarded──▶  :1000  (node dist/main.js)
```

You can remap: `-p 8080:1000` makes the API reachable at `localhost:8080` while the
app still listens on 1000 internally. `EXPOSE` in the Dockerfile only *documents* the
port — it does **not** publish it; you still need `-p`.

⚠️ `localhost` *inside* a container means the container itself, not your laptop and
not other containers. This trips up everyone once. To reach the host from inside a
container, Docker provides `host.docker.internal` (Mac/Windows; on Linux add
`--add-host=host.docker.internal:host-gateway`).

---

## 5.2 Networking #2: containers talking to each other

Verndly's web app must reach the API; the API must reach Postgres and Redis. Publishing
ports to the host and using `localhost` is the wrong way. The right way: put them on a
**user-defined bridge network**, where Docker runs an embedded DNS server so
containers find each other **by name**.

```bash
$ docker network create verndly-net

$ docker run -d --name postgres --network verndly-net \
    -e POSTGRES_PASSWORD=secret postgres:16-alpine

$ docker run -d --name redis --network verndly-net redis:7-alpine

$ docker run -d --name api --network verndly-net -p 1000:1000 \
    -e DATABASE_URL="postgresql://postgres:secret@postgres:5432/postgres" \
    -e REDIS_URL="redis://redis:6379" \
    verndly-api
```

```
            docker network "verndly-net"  (built-in DNS resolves names → IPs)
   ┌──────────────────────────────────────────────────────────────┐
   │   web ───"http://api:1000"───▶ api                             │
   │                                 │  "postgresql://...@postgres" │
   │                                 ├──────────────▶ postgres      │
   │                                 │  "redis://redis:6379"        │
   │                                 └──────────────▶ redis         │
   └──────────────────────────────────────────────────────────────┘
            only `api`/`web` publish a port to the host (-p)
```

🧠 **The service name *is* the hostname.** Inside `verndly-net`, the connection string
`postgresql://postgres:secret@postgres:5432/...` works because `postgres` resolves to
that container's IP. This is the exact mechanism Verndly's `docker-compose.yml` relies
on — its default `DATABASE_URL` is `...@postgres:5432/...` and `REDIS_URL` is
`redis://redis:6379`, using the compose **service names** as hostnames. (Compose
creates a network and joins every service to it automatically — Chapter 6.)

This name-based discovery is also the conceptual seed of Kubernetes **Services**
(Chapter 11): there, `http://api:1000` resolves cluster-wide via DNS, no matter which
node a pod lands on.

### The network drivers (know they exist)
| Driver | Use |
|--------|-----|
| `bridge` | default; isolated network on a single host (what we used above) |
| `host` | container shares the host's network stack (no isolation, fastest) |
| `none` | no networking |
| `overlay` | spans **multiple hosts** (Swarm); the idea K8s generalizes |

---

## 5.3 Storage: why the writable layer isn't enough

Recall Chapter 3: a container's writable layer is **ephemeral** — delete the
container and its writes vanish. For Postgres that's catastrophic: your data would
evaporate on every redeploy. The fix is to mount storage that lives *outside* the
container lifecycle.

### Volumes (managed by Docker) — the production choice
```bash
$ docker volume create pgdata
$ docker run -d --name postgres \
    -v pgdata:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=secret postgres:16-alpine
```
`pgdata` is a Docker-managed volume stored on the host (under
`/var/lib/docker/volumes/`). The container writes its database files to
`/var/lib/postgresql/data`, which is backed by the volume. Destroy and recreate the
container — the data persists because the volume outlives it.

```
   Container (disposable)                Host (durable)
   /var/lib/postgresql/data  ◀── mount ──▶  volume "pgdata"
        (Postgres writes here)               (survives container deletion)
```

📦 Verndly's `docker-compose.yml` declares named volumes exactly for this:
```yaml
volumes:
  verndly-pgdata:
  verndly-redisdata:
# ...
  postgres:
    volumes:
      - verndly-pgdata:/var/lib/postgresql/data
```

### Bind mounts (a host path) — great for development
```bash
$ docker run -v "$(pwd)/apps/api/src:/app/apps/api/src" verndly-api-dev
```
A bind mount maps a **specific host directory** into the container. Edit code on your
laptop → it appears instantly inside the container → with a watcher (`nest start
--watch`) you get live reload. Use bind mounts for dev, named volumes for data.

### tmpfs — in-memory, nothing persisted
`--tmpfs /tmp` for scratch space that should never hit disk (and disappears with the
container).

| | Volume | Bind mount | tmpfs |
|--|--------|-----------|-------|
| Managed by Docker | ✅ | ❌ (you pick host path) | ✅ |
| Survives container deletion | ✅ | ✅ | ❌ |
| Best for | databases, prod data | live-reload dev | secrets/scratch |

🧠 This volume concept becomes Kubernetes **PersistentVolumes / PersistentVolumeClaims**
(Chapter 13). The principle is identical: *separate the durable data from the
disposable compute.*

---

## 5.4 Configuration & secrets at runtime

Twelve-factor apps read config from the environment. Three ways to feed it:

```bash
# one at a time
$ docker run -e NODE_ENV=production -e PORT=1000 verndly-api

# from a file (recommended for many vars)
$ docker run --env-file .env verndly-api
```

📦 The API reads `DATABASE_URL`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `REDIS_URL`,
etc. Verndly's `.env.docker.example` documents every one. The same `--env-file` flow
is what Compose automates.

⚠️ **Never bake secrets into an image.** Anyone who pulls the image can run
`docker history` / extract layers and read a hard-coded `JWT_SECRET`. Secrets are
*runtime* input: env vars (dev), Docker secrets (Swarm), or — at scale — a secret
manager / Kubernetes Secrets (Chapter 12). This is why Verndly's `.dockerignore`
excludes `.env` and the Dockerfiles bake **nothing** sensitive.

🏢 For build-time secrets (e.g. a private registry token needed *during* build),
BuildKit has `RUN --mount=type=secret` so the secret is available to one `RUN` step
**without** ending up in any layer. Never use `ARG` for secrets — `ARG` values are
visible in `docker history`.

---

## 5.5 Logs, exec, and inspection (your daily debugging kit)

```bash
docker logs -f --tail 100 api      # follow the API's stdout/stderr
docker exec -it api sh             # shell into the running API to poke around
docker inspect api                 # full JSON: IP, mounts, env, network, state
docker stats                       # live CPU / memory / net per container
docker top api                     # processes inside the container
docker port api                    # which host ports map to which container ports
docker diff api                    # files changed in the writable layer
```

🧠 **The 12-factor rule: log to stdout/stderr, not files.** A container shouldn't
manage its own log files — it writes to stdout and the platform (Docker, then a log
shipper, then Kubernetes + Loki/CloudWatch) collects and routes them. Verndly's apps
already log to stdout, so `docker logs` and, later, `kubectl logs` Just Work.

---

## 5.6 Resource limits (cgroups, from Chapter 1, made real)

```bash
$ docker run -d --name api \
    --memory=512m \          # OOM-killed if it exceeds 512 MB
    --cpus=0.5 \             # capped at half a CPU core
    --restart=unless-stopped \   # auto-restart if it crashes
    verndly-api
```

- `--memory` maps to the memory cgroup; exceed it and the kernel kills the process
  (you'll see exit code 137 = OOMKilled).
- `--cpus` throttles CPU time.
- `--restart` policies: `no` (default), `on-failure[:max]`, `always`,
  `unless-stopped`. This is a *single-host* restart loop — Kubernetes generalizes it
  into self-healing across a cluster (Chapter 14), and the same `requests`/`limits`
  idea reappears there for scheduling and autoscaling.

⚠️ Node apps don't automatically know their cgroup memory limit on older runtimes,
which can cause surprise OOM kills. Setting `--memory` *and* a matching app-level
heap hint avoids fighting the limiter. (Modern Node respects cgroup limits better,
but it's worth knowing when you see exit 137.)

---

## 5.7 📦 Verndly: the whole stack by hand (the "aha" before Compose)

You *could* wire up the entire app with raw `docker` commands:

```bash
docker network create verndly-net
docker volume create verndly-pgdata

docker run -d --name postgres --network verndly-net \
  -v verndly-pgdata:/var/lib/postgresql/data \
  -e POSTGRES_USER=verndly -e POSTGRES_PASSWORD=verndly -e POSTGRES_DB=verndly \
  postgres:16-alpine

docker run -d --name redis --network verndly-net redis:7-alpine

docker run -d --name api --network verndly-net -p 1000:1000 \
  -e DATABASE_URL="postgresql://verndly:verndly@postgres:5432/verndly?schema=public" \
  -e DIRECT_URL="postgresql://verndly:verndly@postgres:5432/verndly?schema=public" \
  -e REDIS_URL="redis://redis:6379" \
  -e JWT_SECRET="dev-secret" \
  -e FRONTEND_URL="http://localhost:3000" \
  verndly-api

docker run -d --name web --network verndly-net -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:1000" \
  verndly-web
```

It works — but notice how much there is to remember, in the right order, every time.
That ceremony is *exactly* the problem Docker Compose solves, and it's why Verndly
ships a `docker-compose.yml`. On to it.

---

## 5.8 Mental model check

1. Inside the API container, `localhost:5432` fails to reach Postgres. Why, and
   what's the correct host?
2. You `docker rm postgres` and recreate it; the data is still there. What made that
   possible?
3. Why must `JWT_SECRET` be passed at `docker run`, not written in the Dockerfile?
4. Two containers are on the default bridge but can't resolve each other by name.
   What's the fix?

<details>
<summary>Answers</summary>

1. `localhost` inside a container is *that container*. Postgres is a different
   container; reach it by its network name — `postgres:5432` — on a shared
   user-defined network.
2. A named volume mounted at `/var/lib/postgresql/data` stored the data outside the
   container's lifecycle, so it survived deletion.
3. Anything in an image is readable by anyone who pulls it (`docker history`, layer
   extraction). Secrets are runtime input, never baked in.
4. Use a **user-defined** network (`docker network create … && --network …`). The
   *default* bridge has no automatic DNS; user-defined bridges do.
</details>

---

**Next:** [Chapter 6 — Docker Compose: The Whole Verndly Stack Locally](06-docker-compose.md)
