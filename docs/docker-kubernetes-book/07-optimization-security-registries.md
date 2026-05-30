# Chapter 7 — Optimization, Security & Registries

> **Level 60 → 68.** The bridge between "it runs" and "it's production-grade." Smaller
> images, hardened images, multi-arch builds, pushing to a registry, and a real
> CI pipeline that builds and publishes Verndly's images. Everything here feeds
> directly into how Kubernetes pulls and runs your images in Part III.

---

## 7.1 Making images small (and why it pays off)

Small images = faster pulls (so faster autoscaling and deploys), less storage, fewer
CVEs. The levers, in order of impact:

1. **Slim base.** `node:22-alpine` (~150 MB) over `node:22` (~1 GB). Verndly already
   does this. For an even smaller final image, **distroless** (§7.3).
2. **Multi-stage builds.** Already covered — keep build tooling out of the runtime
   image. Verndly's biggest win.
3. **`.dockerignore`.** Don't ship `node_modules`, `.git`, `.next`, `.env`.
4. **Combine `RUN`s + clean up in the same layer.** `apk add … && … && rm -rf
   /var/cache/apk/*` in one instruction (Chapter 3, Trap 1).
5. **Order layers for cache** (Chapter 3's golden rule). Doesn't shrink the image but
   slashes rebuild time.
6. **Prune dependencies.** For Node, ship only production deps.

### 📦 Verndly: squeezing the API further with `pnpm deploy`
The current API Dockerfile keeps the full `node_modules` for reliability (Prisma +
pnpm symlink quirks). If you want a smaller prod image, pnpm can emit a
self-contained, prod-only tree:

```dockerfile
# in the build stage, after building:
RUN pnpm --filter @verndly/api deploy --prod --legacy /prod/api \
 && pnpm --filter @verndly/api exec prisma generate --schema /prod/api/prisma/schema.prisma

# runner stage copies just /prod/api
COPY --from=build --chown=nestjs:nodejs /prod/api ./
CMD ["node", "dist/main.js"]
```

`pnpm deploy` resolves the workspace, copies only prod dependencies (with
`@verndly/types` injected, not symlinked), and produces a portable folder. Just
re-run `prisma generate` against the deployed tree so the client is present.
Measure with `docker images` / `dive` before and after — don't optimize blind.

🧠 **Measure, then optimize.** `docker images` for totals, `docker history <img>`
for per-layer sizes, `dive <img>` to hunt wasted space. A 30-second look often
reveals a stray 200 MB layer worth more than hours of micro-tuning.

---

## 7.2 Image security — the essentials

Containers are a security boundary, but a leaky one if you're careless. The
checklist, each item with the *why*:

| Practice | Why | Verndly status |
|----------|-----|---------------|
| **Run as non-root** (`USER`) | a container escape as root ≈ host root | ✅ `nestjs`/`nextjs` users |
| **Pin base image versions** | `:latest` drifts → unreproducible + surprise CVEs | ✅ `node:22-alpine`, `postgres:16-alpine` |
| **Minimal base** (alpine/distroless) | fewer packages = smaller attack surface | ✅ alpine |
| **No secrets in image** | layers are extractable | ✅ `.env` ignored, runtime injection |
| **Scan images** (Trivy/Grype/Scout) | catch known CVEs before prod | add to CI (§7.5) |
| **Drop Linux capabilities / read-only FS** | least privilege at runtime | done in K8s (Ch 16) |
| **Sign images** (cosign) | prove provenance, prevent tampering | FAANG practice (Ch 16) |

### Scanning (do this in CI)
```bash
# Trivy — finds OS + dependency CVEs in an image:
$ trivy image verndly-api:latest --severity HIGH,CRITICAL

# Docker's built-in scanner:
$ docker scout cves verndly-api:latest
```

⚠️ **`ARG` is not a secret store.** Build args are visible via `docker history`.
For build-time secrets use BuildKit's secret mount:
```dockerfile
RUN --mount=type=secret,id=npmrc \
    cp /run/secrets/npmrc ~/.npmrc && pnpm install && rm ~/.npmrc
```
```bash
$ docker build --secret id=npmrc,src=$HOME/.npmrc ...
```
The secret is available only during that `RUN` and never persists in a layer.

---

## 7.3 Distroless & scratch (the FAANG end of small/secure)

🏢 **Distroless** images (`gcr.io/distroless/nodejs22`) contain your runtime and its
shared libraries — **but no shell, no package manager, no busybox**. Benefits:
- Tiny. Minimal CVE surface (nothing to exploit/escalate with — no `sh`).
- Forces immutability (you literally can't `exec sh` to "fix" things in prod).

The tradeoff: debugging is harder (no shell). Teams pair distroless with **ephemeral
debug containers** (`kubectl debug`, Chapter 16) that attach a temporary toolbox
without baking tools into the prod image.

```dockerfile
# Distroless variant of Verndly's API runner stage (sketch):
FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app/apps/api
COPY --from=build /prod/api ./
USER nonroot
EXPOSE 1000
CMD ["dist/main.js"]      # distroless nodejs image's entrypoint is `node`
```

`scratch` (an empty image) is the extreme — used for static Go/Rust binaries that
need *nothing* else. Not applicable to Node (needs the runtime), but worth knowing.

---

## 7.4 Registries: storing and distributing images

A **registry** is where built images live so other machines (CI, your cluster) can
pull them. The flow:

```
   build ──▶ tag ──▶ push ──▶  REGISTRY  ──▶ pull (by k8s nodes / servers)
                               (ghcr.io, ECR, GAR, Docker Hub, Harbor)
```

### Tagging — the discipline that prevents 3am incidents
```bash
$ docker tag verndly-api:dev ghcr.io/your-org/verndly-api:1.4.2
$ docker tag verndly-api:dev ghcr.io/your-org/verndly-api:$(git rev-parse --short HEAD)
```
- ⚠️ **Never deploy `:latest` to production.** It's a moving target — you can't tell
  which build is running, and rollbacks become guesswork.
- ✅ Tag with an **immutable** identifier: a semver (`1.4.2`) and/or the **git SHA**.
  The SHA tag is gold: it ties a running container to an exact commit. Kubernetes
  manifests should reference these immutable tags (better: **digests**,
  `@sha256:...`) so a deploy is perfectly reproducible.

### Pushing
```bash
$ echo $GHCR_TOKEN | docker login ghcr.io -u your-user --password-stdin
$ docker push ghcr.io/your-org/verndly-api:1.4.2
```

### The major registries
| Registry | Where | Note |
|----------|-------|------|
| Docker Hub | `docker.io` | public default; rate-limited anonymous pulls |
| GitHub Container Registry | `ghcr.io` | free for repos, great with GitHub Actions |
| Amazon ECR | AWS | IAM-integrated; pairs with EKS |
| Google Artifact Registry | GCP | pairs with GKE |
| Harbor | self-hosted | enterprise: RBAC, scanning, replication |

---

## 7.5 📦 CI: build, scan, and push Verndly's images (GitHub Actions)

This is the productionization of "I built it on my laptop." A workflow that, on every
push to `main`, builds both images, tags them with the git SHA, scans them, and pushes
to `ghcr.io`. Put it at `.github/workflows/docker.yml`:

```yaml
name: build-and-push
on:
  push:
    branches: [main]

jobs:
  images:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write          # to push to ghcr.io
    strategy:
      matrix:
        include:
          - app: api
            dockerfile: apps/api/Dockerfile
          - app: web
            dockerfile: apps/web/Dockerfile
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3      # BuildKit + multi-arch

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository_owner }}/verndly-${{ matrix.app }}
          tags: |
            type=sha                  # immutable: tag = git SHA
            type=raw,value=latest,enable={{is_default_branch}}

      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ${{ matrix.dockerfile }}
          push: true
          platforms: linux/amd64,linux/arm64        # multi-arch (§7.6)
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha                       # reuse layer cache across runs
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_API_URL=https://api.verndly.com

      - name: Scan image for CVEs
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository_owner }}/verndly-${{ matrix.app }}:sha-${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: '1'             # fail the build on HIGH/CRITICAL
```

What each part teaches:
- **`matrix`** builds `api` and `web` in parallel from their respective Dockerfiles.
- **`setup-buildx`** enables BuildKit → multi-arch + remote cache.
- **`metadata-action`** auto-generates tags; `type=sha` gives the immutable
  commit-pinned tag your K8s manifests will reference.
- **`cache-from/to: gha`** persists the layer cache between CI runs, so the
  Chapter-3 caching benefits survive across ephemeral runners — `pnpm install`
  doesn't re-run unless a manifest changed.
- **`build-args`** supplies the web app's `NEXT_PUBLIC_API_URL` at build time.
- **Trivy** fails the pipeline if the image ships a known HIGH/CRITICAL CVE.

🧠 The output of this pipeline — `ghcr.io/your-org/verndly-api:sha-abc123` — is the
*exact* artifact Kubernetes will pull in Part III. CI builds it once; every
environment runs that identical, scanned, signed bits. No more "but it built fine on
Render."

---

## 7.6 Multi-architecture builds (Apple Silicon → x86 servers)

You develop on an arm64 Mac; most cloud nodes are amd64. A single-arch image built on
your Mac will fail to start on those nodes (Chapter 3 §3.7). Build both:

```bash
$ docker buildx create --use            # one-time: a multi-arch builder
$ docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f apps/api/Dockerfile \
    -t ghcr.io/your-org/verndly-api:1.4.2 \
    --push .
```

`buildx` produces a **manifest list** — one tag, multiple arch variants. Each node
pulls the variant matching its CPU. (The CI workflow above already sets
`platforms: linux/amd64,linux/arm64`.)

---

## 7.7 BuildKit niceties worth adopting

```dockerfile
# Cache a package manager's download cache across builds (huge for repeat installs):
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```
`--mount=type=cache` persists pnpm's content-addressed store between builds without
baking it into a layer — installs get even faster. Combined with `cache-from gha` in
CI, builds stay snappy.

---

## 7.8 Optimization & security scorecard for Verndly

```
  Image size      ✅ alpine base, multi-stage, standalone Next output
                  ⬜ optional: pnpm deploy --prod / distroless for smaller API
  Build speed     ✅ manifests-first caching;  ⬜ add BuildKit cache mounts + gha cache
  Non-root        ✅ nestjs / nextjs users
  Pinned versions ✅ node:22-alpine, postgres:16-alpine, pnpm@9.15.4
  No baked secrets✅ .env ignored, runtime injection
  CVE scanning    ⬜ add Trivy to CI (§7.5)
  Multi-arch      ⬜ buildx --platform amd64,arm64
  Immutable tags  ⬜ tag with git SHA (don't deploy :latest)
  Image signing   ⬜ cosign (Ch 16)
```

The ✅ items are already done in this repo. The ⬜ items are this chapter's homework
— and they're what separates a hobby setup from a FAANG one.

---

## 7.9 Mental model check

1. Why is deploying `:latest` to production a bad idea, and what should you tag instead?
2. You set a token via `ARG NPM_TOKEN`. Why is that a security bug, and what's the fix?
3. Your image runs on your Mac but `exec format error` on a cloud node. Cause? Fix?
4. How does `cache-from/to: gha` in CI relate to Chapter 3's layer-ordering rule?

<details>
<summary>Answers</summary>

1. `:latest` is mutable — you can't tell which build is live and rollbacks are
   guesswork. Tag with an immutable id: the git SHA and/or a semver (ideally pin by
   digest `@sha256:` in manifests).
2. `ARG` values are recoverable from `docker history` / image metadata — the token
   leaks to anyone with the image. Use BuildKit `RUN --mount=type=secret` instead.
3. Architecture mismatch (arm64 image on amd64 host). Build multi-arch with
   `docker buildx --platform linux/amd64,linux/arm64`.
4. The gha cache persists *layers* across CI runs; the layer-ordering rule decides
   *which* layers stay valid. Together, an ordinary code change reuses the cached
   `pnpm install` layer even on a fresh CI runner.
</details>

---

**End of Part II.** You can now build, optimize, secure, and ship Verndly's images
anywhere. Next we confront the limits of a single host — and meet Kubernetes.

**Next:** [Chapter 8 — From One Host to Many: Why Kubernetes](08-why-kubernetes.md)
