# Chapter 6 — Docker Compose: The Whole Verndly Stack Locally

> **Level 52 → 60.** Chapter 5 ended with a wall of `docker run` commands. Compose
> turns that wall into one declarative file and one command. We'll teardown Verndly's
> real `docker-compose.yml`, including **profiles** (run with or without bundled
> Postgres/Redis) and **healthcheck-gated startup ordering**.

---

## 6.1 What Compose is (and isn't)

**Docker Compose** lets you describe a multi-container app *declaratively* in YAML —
services, networks, volumes, env, dependencies — then bring it all up/down with one
command. It's the natural step between "raw `docker run`" and "Kubernetes."

```
   imperative                       declarative
   ┌──────────────────┐             ┌────────────────────────┐
   │ docker network … │   becomes   │ docker-compose.yml      │
   │ docker volume …  │  ───────▶   │  services: {api, web,   │
   │ docker run … x4  │             │            postgres,...} │
   └──────────────────┘             └────────────────────────┘
        you remember it all          the file remembers it
```

- ✅ Great for: **local dev**, integration tests, CI, single-host small deployments.
- ❌ Not for: multi-node production, autoscaling, self-healing across machines, rolling
  updates at scale. That's Kubernetes (Part III). Compose is the on-ramp; the *mental
  model* (declare desired state, tool reconciles) transfers directly.

🧠 Compose is **declarative**: you say *what* the system should look like, not the
steps to build it. `docker compose up` figures out what to create/recreate to match.
This "desired state" thinking is the single most important idea to carry into K8s.

---

## 6.2 Anatomy of a compose file

```yaml
services:            # the containers (each becomes 1+ container)
  <name>:
    image: ...        # use a prebuilt image, OR
    build: ...        #   build from a Dockerfile
    ports: ["H:C"]    # publish ports
    environment: {}   # env vars
    volumes: []       # mounts
    depends_on: []    # start ordering
    healthcheck: {}   # liveness test
    profiles: []      # optional opt-in grouping
networks: {}          # custom networks (one is auto-created if omitted)
volumes: {}           # named volumes
```

Compose automatically creates a default network and joins every service to it, so
services reach each other **by service name** (Chapter 5's DNS trick, for free).

---

## 6.3 📦 Teardown: Verndly's `docker-compose.yml`

Here it is, then dissected:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    profiles: ["local-infra"]
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-verndly}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-verndly}
      POSTGRES_DB: ${POSTGRES_DB:-verndly}
    ports: ["${POSTGRES_PORT:-5432}:5432"]
    volumes: ["verndly-pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-verndly} -d ${POSTGRES_DB:-verndly}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    profiles: ["local-infra"]
    restart: unless-stopped
    command: ["redis-server", "--save", "60", "1", "--loglevel", "warning"]
    ports: ["${REDIS_PORT:-6379}:6379"]
    volumes: ["verndly-redisdata:/data"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    ports: ["${API_PORT:-1000}:1000"]
    environment:
      NODE_ENV: production
      PORT: 1000
      DATABASE_URL: ${DATABASE_URL:-postgresql://verndly:verndly@postgres:5432/verndly?schema=public}
      DIRECT_URL: ${DIRECT_URL:-postgresql://verndly:verndly@postgres:5432/verndly?schema=public}
      REDIS_URL: ${REDIS_URL:-redis://redis:6379}
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
      PAYSTACK_SECRET_KEY: ${PAYSTACK_SECRET_KEY:-}
      # ...cloudinary / resend / cron / sentry...
    depends_on:
      postgres: { condition: service_healthy, required: false }
      redis:    { condition: service_healthy, required: false }

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:1000}
    restart: unless-stopped
    ports: ["${WEB_PORT:-3000}:3000"]
    environment:
      NODE_ENV: production
      PORT: 3000
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:1000}
    depends_on: ["api"]

volumes:
  verndly-pgdata:
  verndly-redisdata:
```

### Concept 1 — `build` vs `image`
`api` and `web` use `build:` (with `context: .` at the repo root and the right
`dockerfile:`), so Compose builds them from Verndly's Dockerfiles. `postgres`/`redis`
use `image:` — pulled prebuilt from Docker Hub. The `web` service passes
`args: NEXT_PUBLIC_API_URL` — that's the **build-arg** from Chapter 4 that gets
inlined into the Next.js client bundle.

### Concept 2 — variable substitution with defaults
`${JWT_SECRET}` reads from your shell / `.env` file. `${API_PORT:-1000}` means "use
`API_PORT` if set, else default to `1000`." This is how the file stays generic:
`DATABASE_URL` defaults to the bundled Postgres, but you can override it to point at
Supabase without editing the file. Compose auto-loads a `.env` file in the project
dir — hence `cp .env.docker.example .env`.

### Concept 3 — service-name networking
`DATABASE_URL: ...@postgres:5432/...` and `REDIS_URL: redis://redis:6379` use the
**service names** `postgres` and `redis` as hostnames. `NEXT_PUBLIC_API_URL`, by
contrast, defaults to `http://localhost:1000` — because that URL runs in the user's
**browser**, not inside the container network, so it must reach the host-published
port, not the internal service name. 🧠 *Internal calls use service names; calls made
from the browser use the published host address.* Getting this distinction right is a
rite of passage.

### Concept 4 — healthchecks + `depends_on` ordering
`depends_on` with `condition: service_healthy` makes `api` wait until Postgres/Redis
report **healthy** (via their `healthcheck`), not merely *started*. Without this, the
API could boot before Postgres is accepting connections and crash. `pg_isready` and
`redis-cli ping` are the liveness probes. (`required: false` lets the API still start
when those services are excluded by profile — next.)

### Concept 5 — profiles (the bundled-infra toggle)
`postgres` and `redis` carry `profiles: ["local-infra"]`. Services with a profile are
**only** started when that profile is active. So:

```bash
# Everything local — DB + cache included:
$ docker compose --profile local-infra up --build

# Use managed Supabase + Redis Cloud — skip the bundled infra:
#   (set DATABASE_URL / DIRECT_URL / REDIS_URL in .env first)
$ docker compose up --build api web
```

📦 This mirrors Verndly's reality: production uses managed Supabase + Redis Cloud, but
a contributor can spin up a *fully self-contained* stack locally with one flag. Same
file, two modes.

### Concept 6 — `restart: unless-stopped`
If a container crashes, Compose restarts it (unless you explicitly stopped it). A
poor-man's self-healing — Kubernetes does this properly across a whole cluster.

---

## 6.4 The Compose command cheat sheet

```bash
docker compose up                 # create + start everything (attached, logs stream)
docker compose up -d              # ...detached (background)
docker compose up --build         # rebuild images first
docker compose --profile local-infra up -d   # include profiled services
docker compose ps                 # status of services
docker compose logs -f api        # follow one service's logs
docker compose exec api sh        # shell into the running api
docker compose down               # stop + remove containers/networks
docker compose down -v            # ...AND delete named volumes (wipes the DB!)
docker compose config             # render + validate the final config
docker compose build web          # build just one service
docker compose restart api        # restart one service
```

⚠️ `docker compose down -v` deletes `verndly-pgdata` → **your local database is gone.**
Plain `down` keeps volumes. Know the difference before you fat-finger it.

---

## 6.5 First-run gotcha: the database schema

Verndly uses Prisma's `db push` workflow (no migration history committed). A freshly
created Postgres volume is **empty** — the tables don't exist yet. After the first
`up`, push the schema once (the Prisma CLI is present in the API image):

```bash
$ docker compose exec api node_modules/.bin/prisma db push
```

🧠 This is a recurring theme: **stateful services need initialization** (schema,
seed data) that's separate from "the container started." In Kubernetes we handle
this with **Jobs** and **init containers** (Chapters 10/15) so it's automated, not a
manual step.

---

## 6.6 Bringing it together — the full local workflow

```bash
$ cp .env.docker.example .env          # then set JWT_SECRET at minimum
$ docker compose --profile local-infra up --build -d
$ docker compose exec api node_modules/.bin/prisma db push   # first run only
$ docker compose ps                    # all healthy?
$ open http://localhost:3000           # the storefront
$ open http://localhost:1000           # the API
$ docker compose logs -f               # watch everything
$ docker compose down                  # stop (keeps your data)
```

You now have the entire Verndly platform — web, API, database, cache — running
identically on any machine, defined in one file. That is the summit of single-host
Docker. The remaining question Compose *can't* answer: *what happens when one machine
isn't enough, or when a machine dies at 3am?* That's Part III.

---

## 6.7 Compose vs Kubernetes — a preview mapping

You already understand more K8s than you think. The concepts map almost 1:1:

| Docker Compose | Kubernetes | Chapter |
|----------------|-----------|---------|
| `service` (build/image) | **Deployment** + **Pod** | 10 |
| `ports: H:C` (publish) | **Service** (+ Ingress) | 11 |
| `environment:` | **ConfigMap** / **Secret** | 12 |
| named `volumes:` | **PersistentVolumeClaim** | 13 |
| `healthcheck:` | **liveness/readiness probes** | 14 |
| `restart: unless-stopped` | controller **self-healing** | 14 |
| `deploy.replicas` (Swarm) | `replicas:` | 10 |
| the whole `docker-compose.yml` | a set of **manifests** / a **Helm chart** | 15 |

Keep this table in mind — Part III is largely "the same ideas, but distributed,
self-healing, and scalable."

---

## 6.8 Mental model check

1. Why does `NEXT_PUBLIC_API_URL` default to `localhost:1000` while `DATABASE_URL`
   uses `postgres:5432`?
2. What does `profiles: ["local-infra"]` achieve for the Postgres service?
3. Why use `condition: service_healthy` in `depends_on` instead of plain `depends_on`?
4. Teammate runs `docker compose down -v` and loses all local data. What happened,
   and how should they have stopped it?

<details>
<summary>Answers</summary>

1. `NEXT_PUBLIC_API_URL` is used by the browser (outside the container network), so
   it must hit the host-published port. `DATABASE_URL` is used by the API *inside*
   the network, where `postgres` resolves via Compose's DNS to the DB container.
2. Postgres only starts when you pass `--profile local-infra`. Omit it (to use
   managed Supabase) and the bundled DB is skipped — one file, two deployment modes.
3. It waits for the DB's healthcheck to pass (actually accepting connections) before
   starting the API, preventing boot-time crash races. Plain `depends_on` only waits
   for the container to *start*, not to be *ready*.
4. `-v` also removes named volumes, including `verndly-pgdata`. Use `docker compose
   down` (no `-v`) to stop while keeping data.
</details>

---

**Next:** [Chapter 7 — Optimization, Security & Registries](07-optimization-security-registries.md)
