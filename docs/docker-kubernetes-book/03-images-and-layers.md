# Chapter 3 — Images, Layers & the Union Filesystem

> **Level 18 → 28.** This is the chapter that separates people who "use Docker" from
> people who *understand* it. Layers explain why builds are fast, why images are
> small (or huge), why caching works, and why the order of lines in a Dockerfile
> matters enormously. Verndly's Dockerfiles are deliberately structured around these
> rules — by the end you'll see why.

---

## 3.1 An image is a stack of layers

An image is **not** one monolithic blob. It's an ordered stack of **read-only
layers**, each one a set of filesystem changes (a diff) relative to the layer below.

```
   IMAGE = ordered, content-addressed, read-only layers

   ┌─────────────────────────────────────────┐  ← layer 4: COPY dist ./dist
   │  + /app/apps/api/dist/main.js  ...        │     (your built code)
   ├─────────────────────────────────────────┤  ← layer 3: RUN pnpm install
   │  + /app/node_modules/ (thousands of files)│     (dependencies)
   ├─────────────────────────────────────────┤  ← layer 2: RUN apk add openssl
   │  + /usr/lib/libssl.so ...                 │
   ├─────────────────────────────────────────┤  ← layer 1: the node:22-alpine base
   │  /bin /usr /lib  (Alpine + Node)          │
   └─────────────────────────────────────────┘
```

Each layer is identified by a **SHA-256 hash of its contents** ("content-addressed").
Change one byte → new hash → new layer. Identical layers are stored once and
**shared** across images. This single design choice gives Docker its superpowers.

---

## 3.2 The union filesystem: stacking layers into one view

A container needs to see a *single* filesystem, not a pile of diffs. The kernel's
**OverlayFS** (a union/overlay filesystem) merges the read-only layers and adds one
**thin writable layer** on top, presenting a unified `/` to the process.

```
   What the PROCESS sees: one merged filesystem ( "/" )
   ─────────────────────────────────────────────────────
   ┌───────────────────────────────────────────────┐
   │  WRITABLE container layer (per-container, R/W)  │  ← new files, logs, temp
   ├───────────────────────────────────────────────┤  ╮
   │  image layer 4 (your code)          read-only   │  │
   │  image layer 3 (node_modules)       read-only   │  │ shared by every
   │  image layer 2 (openssl)            read-only   │  │ container from
   │  image layer 1 (alpine + node)      read-only   │  │ this image
   └───────────────────────────────────────────────┘  ╯
```

🧠 **Copy-on-write (CoW).** The image layers are read-only and shared. When a
container *writes* a file, OverlayFS copies it up into the writable layer first,
then modifies the copy. The underlying image is never touched. Consequences:

- Ten Verndly API containers from one image share the read-only layers on disk →
  huge storage savings and instant startup (nothing to copy at launch).
- Anything a container writes lives only in its disposable writable layer. **Delete
  the container and that data is gone.** This is *why* databases need volumes
  (Chapter 5) — you must not store Postgres data in the writable layer.

⚠️ The writable layer is also why you should never "fix" a running container by
editing files inside it. That change vanishes on the next deploy. Fix the
Dockerfile, rebuild the image. Immutability.

---

## 3.3 Each Dockerfile instruction = (usually) one layer

When you build, most instructions add a layer:

```dockerfile
FROM node:22-alpine        # layers from the base image
RUN apk add --no-cache openssl   # → new layer (the installed package)
WORKDIR /app                     # → metadata layer (cheap)
COPY package.json ./             # → new layer (one file)
RUN pnpm install                 # → new layer (node_modules — big!)
COPY . .                         # → new layer (all source)
CMD ["node", "dist/main.js"]     # → metadata only (no filesystem change)
```

Some instructions (`CMD`, `ENV`, `EXPOSE`, `WORKDIR`, `LABEL`) only change
**metadata** and add negligible-size layers. Others (`RUN`, `COPY`, `ADD`) change
the **filesystem** and can be large.

---

## 3.4 The build cache — the most important performance concept

Docker caches each layer. On rebuild, it walks instructions top-to-bottom and
**reuses a cached layer if nothing that affects it changed.** The instant something
changes, that layer and **every layer after it** are rebuilt (the cache is
"invalidated" downward).

```
   Rebuild after editing ONLY your source code:

   FROM node:22-alpine          ✅ cache hit
   RUN apk add openssl          ✅ cache hit
   COPY package.json ./         ✅ cache hit   (package.json unchanged)
   RUN pnpm install             ✅ cache hit   ← the slow step is SKIPPED 🎉
   COPY . .                     ❌ changed!    ← your edited file invalidates here
   RUN pnpm build               ❌ rebuild     ← and everything after
```

The cache key for a `COPY`/`ADD` is a checksum of the files being copied. For `RUN`
it's the literal command string (plus the state of prior layers).

### 🧠 The golden rule of Dockerfile ordering
**Order instructions from least-frequently-changed to most-frequently-changed.**

Your dependencies change rarely; your source code changes every commit. So copy and
install dependencies *first*, copy source *last*. That way an ordinary code edit
keeps the expensive `pnpm install` layer cached.

This is **exactly** why Verndly's `apps/api/Dockerfile` copies only the
`package.json` files and the lockfile, runs `pnpm install`, and *only then* copies
the rest of the source:

```dockerfile
# deps stage — copy ONLY manifests first, so this layer caches across code edits
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts   # ← cached unless a manifest changes

# build stage — NOW copy the rest of the source
COPY . .
```

⚠️ The classic beginner mistake (and why it's slow):

```dockerfile
# BAD — any code change re-runs the multi-minute install
COPY . .
RUN pnpm install
```

Here `COPY . .` brings in your source, so editing one line changes that layer,
invalidates the cache, and `pnpm install` runs from scratch *every single build*.
The Verndly ordering turns a 3-minute rebuild into a 5-second one.

---

## 3.5 Why layers also control image *size*

A layer's size is the files it adds. Two traps:

### Trap 1: deleting in a later layer doesn't shrink the image
```dockerfile
RUN apk add build-tools        # layer A: +200 MB
RUN apk del build-tools        # layer B: records a "deletion" but A still exists!
```
Layers are stacked, not merged. The 200 MB is still in layer A, shipped forever.
**Fix:** install and remove in the *same* `RUN`, or use multi-stage builds
(Chapter 4) so the bloat never reaches the final image.

```dockerfile
RUN apk add --no-cache --virtual .build build-tools \
 && make \
 && apk del .build            # all in ONE layer → the net result is small
```

### Trap 2: a fat base image
`node:22` (Debian-based) is ~1 GB. `node:22-alpine` is ~150 MB. Verndly uses
`-alpine` everywhere for exactly this reason. (Alpine uses `musl` libc instead of
`glibc`, which is why the Dockerfile adds `libc6-compat` — a shim some native
modules like `sharp`/`bcrypt` expect.)

🏢 **FAANG-scale teams** push this further with **distroless** or **scratch** base
images (no shell, no package manager — just your binary and its libs) to shrink
attack surface and size. We cover this in Chapter 7.

---

## 3.6 Inspecting layers (see it for real)

```bash
# How an image's layers were built, with sizes:
$ docker history node:22-alpine

# Full metadata as JSON (env, cmd, layers, architecture):
$ docker inspect node:22-alpine

# The image's config + manifest:
$ docker buildx imagetools inspect node:22-alpine
```

A great learning tool is **`dive`** (a TUI that shows each layer's file changes and
flags wasted space):

```bash
$ dive verndly-api:latest        # explore layer-by-layer, see what bloats it
```

---

## 3.7 The standard underneath: OCI

Everything above is formalized by the **Open Container Initiative (OCI)**, which
defines two specs:

- **Image spec** — the on-disk/registry format: a `manifest` (JSON listing the
  layers + a `config`), the `config` (env, cmd, architecture), and the **layers**
  (gzipped tarballs of filesystem diffs).
- **Runtime spec** — how to take an unpacked image and run it as a container.

```
   An image in a registry =
     manifest.json  ─┬─▶ config.json   (cmd, env, os/arch, layer order)
                     └─▶ [ layer1.tar.gz, layer2.tar.gz, ... ]  (content-addressed)
```

🧠 Because the format is standardized, an image you build with Docker is consumed
unchanged by containerd in your Kubernetes cluster, by Podman on a colleague's
laptop, or by AWS Fargate. **Build once, run anywhere** is not marketing — it's the
OCI spec doing its job. This is the bridge that makes Part III (Kubernetes) work
with the very same Verndly images you build in Part I.

### Multi-architecture images
A single tag like `node:22-alpine` actually points to a **manifest list** with one
entry per CPU architecture (`amd64`, `arm64`). Your Mac (arm64) pulls the arm64
variant; a cloud server (amd64) pulls amd64. When you build Verndly images on an
Apple Silicon Mac to deploy on amd64 servers, you'll use `docker buildx build
--platform linux/amd64,linux/arm64` to produce both (Chapter 7).

---

## 3.8 📦 Verndly: layers in the API image

Conceptually, after Chapter 4's build, `docker history verndly-api` will show a stack
roughly like:

```
   SIZE     CREATED BY
   ~5 MB    CMD ["node","dist/main.js"]          (metadata)
   ~2 MB    COPY apps/api/dist                   (your compiled API)
   ~1 MB    COPY packages/types/dist             (shared types)
   ~250 MB  COPY node_modules                    (deps — the big one)
   ~10 MB   RUN apk add libc6-compat openssl
   ~150 MB  FROM node:22-alpine                  (base)
```

The two levers you now understand:
1. **Caching:** manifests-then-source ordering keeps `node_modules` cached across
   code edits.
2. **Size:** alpine base + multi-stage build (next chapter) keeps the build
   toolchain (the Nest CLI, the TypeScript compiler, dev dependencies) *out* of this
   final stack.

---

## 3.9 Mental model check

1. You edit one line in `apps/api/src/main.ts` and rebuild. Which is reused from
   cache: the `pnpm install` layer or the `COPY . .` layer? Why?
2. Why does `RUN apk add x` then a later `RUN apk del x` not reduce image size?
3. How can ten containers from one image barely use more disk than one?
4. You build on an M-series Mac and the image won't start on a Linux x64 server.
   What's the likely cause and the fix?

<details>
<summary>Answers</summary>

1. The `pnpm install` layer is **reused** (the manifests it depends on didn't
   change). `COPY . .` is **invalidated** because a source file changed — and every
   layer after it rebuilds. That's the payoff of the manifests-first ordering.
2. Layers are stacked diffs, not merged. The `add` layer still contains the files;
   the `del` layer only records a whiteout on top. Both ship. Combine into one `RUN`.
3. The read-only image layers are shared (CoW). Each container adds only a thin
   writable layer; common files exist once on disk.
4. Architecture mismatch — you built an `arm64` image; the server is `amd64`. Build
   with `docker buildx --platform linux/amd64` (or a multi-arch manifest).
</details>

---

**Next:** [Chapter 4 — Dockerfiles Mastered (Verndly's API & web)](04-dockerfiles-mastered.md)
