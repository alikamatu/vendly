# Chapter 4 — Dockerfiles Mastered (Verndly's API & web)

> **Level 28 → 42.** Every Dockerfile instruction, when to use which, the multi-stage
> pattern, and then a **line-by-line teardown of Verndly's real `apps/api/Dockerfile`
> and `apps/web/Dockerfile`**. After this chapter you can author a production
> Dockerfile for any app from a blank file.

---

## 4.1 The full instruction set (with when-to-use)

| Instruction | What it does | Notes / Verndly use |
|-------------|--------------|--------------------|
| `FROM` | sets the base image (starts a build stage) | `FROM node:22-alpine AS base` |
| `RUN` | execute a command at **build** time → new layer | install packages, build code |
| `COPY` | copy files from build context into the image | `COPY apps/api/dist ./dist` |
| `ADD` | like COPY but also untars + fetches URLs | ⚠️ prefer `COPY`; `ADD` is surprising |
| `WORKDIR` | set the working directory (and `cd` for later cmds) | `WORKDIR /app` |
| `ENV` | set an environment variable (persists at runtime) | `ENV NODE_ENV=production` |
| `ARG` | a **build-time** variable (not in final runtime env) | `ARG NEXT_PUBLIC_API_URL` |
| `EXPOSE` | document a port (does **not** publish it) | `EXPOSE 1000` |
| `CMD` | default command if none given at `run` | `CMD ["node","dist/main.js"]` |
| `ENTRYPOINT` | the fixed executable; `CMD` becomes its args | for wrapper scripts |
| `USER` | switch the user for later instructions + runtime | `USER nestjs` (non-root!) |
| `HEALTHCHECK` | command Docker runs to test liveness | both Verndly images use this |
| `LABEL` | metadata key/values | `LABEL org.opencontainers.image.source=...` |
| `VOLUME` | declare a mount point for external storage | rarely needed in app images |
| `ONBUILD` | deferred instruction for child images | niche |

### CMD vs ENTRYPOINT — the classic confusion
- `ENTRYPOINT` = the program that always runs. `CMD` = its default arguments.
- If you set only `CMD ["node","dist/main.js"]`, the user can override the whole
  thing: `docker run verndly-api sh` runs a shell instead.
- If you set `ENTRYPOINT ["node"]` + `CMD ["dist/main.js"]`, then `docker run
  verndly-api other.js` runs `node other.js` — the entrypoint is locked, args swap.

🧠 **Exec form vs shell form.** Always prefer the JSON array ("exec") form:
`CMD ["node","dist/main.js"]`. The string ("shell") form `CMD node dist/main.js`
wraps your process in `/bin/sh -c`, so your app becomes a *child* of the shell and
**doesn't receive `SIGTERM`** on `docker stop` → it gets killed hard after a
timeout. For a graceful shutdown (closing DB connections, finishing in-flight
requests), use the exec form. Verndly's Dockerfiles use exec form for exactly this.

### ARG vs ENV — the build-time / runtime distinction
- `ARG` exists only during the build (`--build-arg KEY=val`). Not present when the
  container runs.
- `ENV` persists into the running container.

This matters acutely for Next.js. `NEXT_PUBLIC_*` values get **inlined into the
client JavaScript bundle at build time**, so they must be `ARG`s passed *during the
build* — setting them only at runtime is too late. That's why Verndly's web Dockerfile
takes `ARG NEXT_PUBLIC_API_URL` (more in §4.6).

---

## 4.2 The build context (and why `.dockerignore` matters)

```bash
$ docker build -f apps/api/Dockerfile -t verndly-api .
#                                                    ^ the build CONTEXT
```

That trailing `.` is the **build context**: the directory the daemon tars up and
sends to itself. `COPY` can only see files inside the context. Two implications:

1. **Send the context from the repo root** for Verndly, because the API depends on
   the workspace lockfile and `@verndly/types` — files *outside* `apps/api/`. That's
   why we build with context `.` (root) and `-f apps/api/Dockerfile`.
2. **`.dockerignore` keeps junk out of the context** — faster builds, smaller cache
   keys, no secrets leaked into images. Verndly's `.dockerignore`:

```gitignore
**/node_modules        # reinstalled in-image from the lockfile
**/dist
**/.next
.env                   # never bake secrets into an image
.git
**/*.md
```

⚠️ Shipping `node_modules` or `.git` into the context is a top cause of "why is my
build so slow / my image 2 GB." Always have a `.dockerignore`.

---

## 4.3 Multi-stage builds — the single most important production pattern

**Problem:** to *build* Verndly's API you need dev tooling — the Nest CLI, TypeScript,
`@swc/core`, the Prisma CLI. To *run* it you need none of that — just Node and the
compiled `dist/` + production deps. If you build and run in one stage, all that
tooling ships to production: bigger image, bigger attack surface.

**Solution:** multiple `FROM` statements in one Dockerfile. Each `FROM` starts a new
**stage**. You build in a heavy stage, then `COPY --from=<stage>` only the artifacts
you need into a lean final stage. The intermediate stages are discarded.

```
   STAGE base    (pnpm + system libs)              ─┐
        │  shared starting point                    │  all thrown away
   STAGE deps    (install ALL deps)                 │  except what the
        │  RUN pnpm install                          │  final stage
   STAGE build   (compile types, prisma gen, build) │  COPYs out
        │  RUN nest build                            │
   ─────┼───────────────────────────────────────────┘
        │  COPY --from=build  /app/apps/api/dist ...
        ▼
   STAGE runner  (ONLY: node + dist + prod node_modules)   ← this is the image you ship
```

This is the backbone of both Verndly Dockerfiles. Let's read them.

---

## 4.4 📦 Teardown: `apps/api/Dockerfile` (NestJS API)

Here it is in full, then annotated stage by stage:

```dockerfile
# syntax=docker/dockerfile:1

# ---- base: pnpm + native build prerequisites, shared by every stage ----
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- deps: install the full workspace dependency graph (well-cached) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build: compile @verndly/types, generate Prisma client, build the API ----
FROM deps AS build
COPY . .
RUN pnpm --filter @verndly/types build \
  && pnpm --filter @verndly/api exec prisma generate \
  && pnpm --filter @verndly/api build

# ---- runner: lean runtime image, non-root ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/types/package.json ./packages/types/package.json
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
USER nestjs
WORKDIR /app/apps/api
ENV PORT=1000
EXPOSE 1000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||1000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main.js"]
```

### Line-by-line

**`# syntax=docker/dockerfile:1`** — opts into the latest BuildKit frontend
(modern caching, `--mount` features). Always put this first.

**`FROM node:22-alpine AS base`** — start from a small Linux image that already has
Node 22. `AS base` names the stage so other stages can build `FROM base`.

**`ENV PNPM_HOME` / `PATH` + `corepack prepare pnpm@9.15.4`** — Verndly is a pnpm
workspace pinned to pnpm 9.15.4 (see root `package.json` → `packageManager`).
`corepack` (bundled with Node) installs that exact pnpm so the in-image build
matches your local toolchain. Pinning the version prevents "works locally, breaks in
CI" drift.

**`RUN apk add --no-cache libc6-compat openssl`** — Alpine uses `musl`, not `glibc`.
`libc6-compat` is a glibc shim that native modules (`bcrypt`, `sharp`) need.
`openssl` is required by Prisma's query engine at runtime. `--no-cache` avoids
caching the apk index → smaller layer.

**`WORKDIR /app`** — all subsequent paths are relative to `/app`.

**`deps` stage** — here's Chapter 3's golden rule in practice. We copy **only the
manifests** (`package.json`s + lockfile) and run `pnpm install`. Because no source
is present yet, this expensive layer **stays cached** across ordinary code edits.
- `--frozen-lockfile` → fail if the lockfile would change (reproducible installs;
  the same rule CI should enforce).
- `--ignore-scripts` → skip lifecycle scripts now. The API's `postinstall` runs
  `prisma generate`, but the Prisma *schema* isn't copied yet — so we defer it.

**`build` stage** (`FROM deps`) — now `COPY . .` brings in all source (this is the
layer that changes every commit, correctly placed *last*). Then, in one `RUN`:
1. `pnpm --filter @verndly/types build` — compile the shared types package the API
   imports.
2. `prisma generate` — now that `apps/api/prisma/schema.prisma` exists, generate the
   typed Prisma client into `node_modules`.
3. `pnpm --filter @verndly/api build` — `nest build` → compiles TypeScript to
   `apps/api/dist`.

**`runner` stage** (`FROM base`) — a fresh lean stage. None of the build tooling
follows automatically; we explicitly `COPY --from=build` only what runtime needs:
- the compiled `dist/`, the workspace `node_modules` (with the generated Prisma
  client), `@verndly/types/dist`, and the Prisma schema (needed for `prisma db push`
  / introspection at runtime).
- `RUN addgroup … adduser … nestjs` + `USER nestjs` → **never run as root.** If the
  app is compromised, the attacker is an unprivileged user, not root. `--chown` sets
  ownership during copy so the non-root user can read the files.
- `ENV PORT=1000` + `EXPOSE 1000` — the API listens on 1000 (see `apps/api/src/main.ts`
  → `app.listen(1000)`). `EXPOSE` documents it; publishing happens at `run`/compose.
- `HEALTHCHECK` — a tiny Node one-liner hits `http://127.0.0.1:1000/`. Exit 0 if the
  status is `<500`. Docker (and Compose/K8s tooling) use this to know the container
  is actually *serving*, not just *running*. We revisit probes in Chapter 14.
- `CMD ["node","dist/main.js"]` — exec form → the Node process is PID 1 and receives
  `SIGTERM` for graceful shutdown.

🧠 **Why keep the full `node_modules` instead of pruning dev deps?** A comment in the
real Dockerfile explains it: Prisma's generated client + pnpm's symlinked store
layout don't survive a partial/`--prod` copy cleanly, so we keep the installed tree
and rely on multi-stage to drop the *build toolchain* (Nest CLI, tsc) by simply not
copying it. The tradeoff: a slightly larger image for a far more reliable one.
Chapter 7 shows the `pnpm deploy --prod` route if you want to squeeze it.

---

## 4.5 📦 Teardown: `apps/web/Dockerfile` (Next.js storefront)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY . .
RUN pnpm --filter @verndly/types build \
  && pnpm --filter @verndly/web exec next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
```

### What's different from the API, and why

**`ARG NEXT_PUBLIC_API_URL` + `ENV NEXT_PUBLIC_API_URL=$…` in the build stage.**
As noted, `NEXT_PUBLIC_*` is compiled *into the browser bundle*. It must be present
**at build time**, so we accept it as a build arg and promote it to an env var before
`next build`. Setting it only at runtime would have no effect on already-compiled JS.

**`next build` via `exec`, not the package script.** Verndly's `web` package has a
`postbuild` step that pings a sitemap endpoint (needs network + prod creds). Inside
an image build that would fail, so we call `pnpm --filter @verndly/web exec next
build` directly, bypassing the `postbuild` hook.

**The standalone output (the clever part).** Verndly's `next.config.ts` sets:
```ts
output: 'standalone',
outputFileTracingRoot: path.join(__dirname, '../../'),
```
`output: 'standalone'` makes Next trace *exactly* which files and node_modules the
server actually needs and emit a self-contained bundle at `.next/standalone`,
complete with a minimal `server.js`. In a monorepo, `outputFileTracingRoot` must
point at the repo root so tracing can follow the pnpm symlinks into `@verndly/types`.

The runner stage then copies just three things:
1. `.next/standalone` → the server + its traced minimal `node_modules` (tiny vs. the
   full install),
2. `.next/static` → the prebuilt static assets (not traced, copied separately),
3. `public/` → images, favicon, etc.

`CMD ["node","apps/web/server.js"]` runs that standalone server. `HOSTNAME=0.0.0.0`
makes it bind all interfaces so it's reachable from outside the container. The
resulting web image is dramatically smaller than copying the whole workspace.

🧠 Note this final `FROM node:22-alpine` is a *plain* base (no pnpm, no corepack) —
standalone needs nothing but Node. Smaller still.

---

## 4.6 Building the images

```bash
# from the repo root:
$ docker build -f apps/api/Dockerfile -t verndly-api:dev .

$ docker build -f apps/web/Dockerfile \
    --build-arg NEXT_PUBLIC_API_URL=http://localhost:1000 \
    -t verndly-web:dev .
```

Watch the output and you'll *see* the stages and cache:
```
 => [deps 4/8] RUN pnpm install --frozen-lockfile        CACHED
 => [build 2/3] COPY . .
 => [build 3/3] RUN pnpm --filter @verndly/types build && ...
 => exporting to image
```

Run them (with a `.env` for the API):
```bash
$ docker run --rm -p 1000:1000 --env-file .env verndly-api:dev
$ docker run --rm -p 3000:3000 verndly-web:dev
```

---

## 4.7 Authoring checklist (use this for any app)

```
□ Start FROM a slim, version-pinned base (node:22-alpine, not node:latest)
□ Pin your package manager (corepack prepare pnpm@x.y.z)
□ Add only the OS libs you truly need (--no-cache)
□ Copy dependency manifests, install, THEN copy source (cache!)
□ Use multi-stage: build heavy, ship lean (COPY --from=build)
□ Run as a non-root USER
□ EXPOSE the port, set sane ENV defaults
□ CMD/ENTRYPOINT in exec form (JSON array) for signal handling
□ Add a HEALTHCHECK
□ Ship a .dockerignore (node_modules, .git, .env, dist)
□ Never COPY secrets; pass them at runtime
```

---

## 4.8 Mental model check

1. Why does the API Dockerfile copy `package.json` files *before* `COPY . .`?
2. Why is `NEXT_PUBLIC_API_URL` an `ARG` in the build stage rather than just a
   runtime `ENV`?
3. What would break if `CMD` used the shell form `CMD node dist/main.js`?
4. The runner stage starts `FROM base` (API) / `FROM node:22-alpine` (web), not
   `FROM build`. Why is that the whole point of multi-stage?

<details>
<summary>Answers</summary>

1. To keep the slow `pnpm install` layer cached. Manifests change rarely; source
   changes every commit. Copying source last means edits don't invalidate install.
2. `NEXT_PUBLIC_*` is inlined into the client JS at **build** time. A runtime ENV is
   too late — the bundle is already compiled. So it must be a build-time `ARG`.
3. Shell form runs the app as a child of `/bin/sh -c`, so the Node process wouldn't
   receive `SIGTERM` on `docker stop` → no graceful shutdown, hard kill after timeout.
4. Starting the runner from a clean base means none of the build-stage tooling (Nest
   CLI, tsc, dev deps) is present unless explicitly `COPY --from=build`'d. You ship
   only artifacts → small, secure image.
</details>

---

**Next:** [Chapter 5 — Running Containers: CLI, Networking, Volumes](05-running-containers.md)
