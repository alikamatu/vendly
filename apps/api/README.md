# Verndly API

The core backend service for the Verndly platform, built with NestJS and Prisma. Admin functionality, Verndly AI services, and multi-channel catalog importers are built directly into this API.

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm (v9+)
- PostgreSQL
- Redis (optional, falls back to in-memory)
- Cloudinary Account
- Resend API Key
- Paystack Account
- Gemini API Key (`GEMINI_API_KEY` — enables Verndly AI features)

### Installation

1. **Dependencies**: Run from the root of the monorepo:
   ```bash
   pnpm install
   ```
2. **Environment Setup**:
   ```bash
   cd apps/api
   cp .env.example .env
   ```
   Update the variables with your credentials (see `.env.example` for `GEMINI_API_KEY`, `GEMINI_MODEL`, `LOOPS_API_KEY`, `SENTRY_DSN`, etc.).
3. **Database Migration**:
   From the monorepo root:
   ```bash
   pnpm --filter @vendly/api exec prisma generate
   pnpm --filter @vendly/api exec prisma migrate dev
   ```

## 🛠 Available Scripts

Run these from the monorepo root using Turborepo filters:

- `pnpm --filter @vendly/api dev`: Starts the development server with watch mode (port 1000).
- `pnpm --filter @vendly/api build`: Generates Prisma Client and compiles the production bundle (`nest build`).
- `pnpm --filter @vendly/api test`: Runs Jest unit tests (AI, website importer, WhatsApp catalog, order guards, etc.).
- `pnpm --filter @vendly/api lint`: Checks for ESLint errors.

## 🏗 Core Modules

- **AI (`src/ai/`)**: **Verndly AI** backed by Google's Gemini API (`GeminiService`, `BuyerSearchService`). Supports natural-language buyer search (`POST /ai/buyer-search` with `fast` Flash-Lite mode, 5-minute category & LRU query-plan caches, and deterministic fallback), single & bulk photo-to-listing analysis, listing copy polish, storefront setup drafting, and WhatsApp catalog screenshot parsing with normalized `image_box_2d` photo bounding boxes.
- **Product (`src/product/`)**: Product listings CRUD, dynamic categories, SKU variants, Cloudinary media uploads/mirroring, bulk CSV import, **Website Importer** (`website-import.service.ts` — Shopify, WooCommerce, JSON-LD/Jumia, `__NEXT_DATA__`, Next.js/React SPA REST discovery, Verndly AI DOM fallback, authenticated SSRF-safe `image-proxy`), **WhatsApp Catalog Importer** (`whatsapp-catalog.service.ts` — `wa.me/p/...` link preview extraction, Verndly AI screenshot extraction, Meta CSV & Graph API), and shared semantic 15-category matching (`category-matcher.ts`).
- **Auth (`src/auth/`)**: JWT-based authentication, Google OAuth, 2FA (TOTP + SMS via Arkesel), role management, and account recovery.
- **Admin (`src/admin/`)**: Built-in endpoints for seller approvals, user management, order/return moderation, and financial reconciliation.
- **Store, Analytics & Subscription**: Storefront profile management, analytics, Pro rankings, and seller subscriptions.
- **Order (`src/order/`)**: Checkout creation (blocks seller self-purchase with `403 Forbidden`), fulfillment status workflows, and returns.
- **Payments (`src/payments/`)**: Full Paystack integration for transactions, split payments, subaccount creation, and payouts using a double-entry ledger.
- **Review, Notification, Email, Loops & Events**: Verified-purchase reviews with flagging, 16 in-app notification types, Resend transactional emails, Loops.so audience automations, and event handlers.
- **Audit (`src/audit/`)**: Append-only log of consequential admin + seller actions (`product.*`, `product.whatsapp_import`, `order.status_change`, `payout.retry`, `approval.*`, `user.*`). Writes are fire-and-forget; readable via `GET /audit-logs`.
- **Common (`src/common/`)**: Shared utilities, `CloudinaryService` (with browser-header URL mirroring, raster magic-byte sniffing, and remote-fetch fallback), API response interceptors, and global exception filters.

## 🔐 Security & Hardening

### Paystack webhook hardening (`/webhooks/paystack`)

- Refuses any request without a raw body — JSON re-serialisation breaks Paystack's HMAC signature.
- Verifies the `x-paystack-signature` header with `crypto.timingSafeEqual` against an HMAC-SHA512 of the raw body.
- Dedupes on `payment_logs.event_id` (unique constraint) atomically — duplicate deliveries get `{ received: true, duplicate: true }` without re-running side effects.

### Website & WhatsApp importer hardening

- `validatePublicWebsiteUrl` enforces public HTTPS hosts and blocks localhost, loopback, link-local metadata endpoints (`169.254.169.254`), and private RFC-1918 networks.
- `GET /products/website-import/image-proxy` requires `SELLER`/`ADMIN` JWT auth, validates target URLs, and sniffs binary magic bytes (`JPEG`, `PNG`, `GIF`, `WebP`, `AVIF`) so active HTML/SVG payloads are never served.
- `WhatsAppCatalogService` restricts link imports strictly to official WhatsApp hosts (`wa.me`, `whatsapp.com`, `api.whatsapp.com`, `catalog.whatsapp.com`).

### Seller self-purchase guard

- `OrderService.createOrder` verifies that none of the requested products belong to the authenticated buyer's `SellerProfile` and throws `ForbiddenException` if a seller attempts to buy their own item.

### Admin notifications on seller verification

When a user submits a seller verification request (`POST /auth/submit-verification`), the API sends:

- An email to `ADMIN_NOTIFY_EMAIL` (falls back to `SUPPORT_EMAIL`) via Resend.
- An SMS to `ADMIN_NOTIFY_PHONE` via Arkesel (only when set + `ARKESEL_API_KEY` configured).

Both are fire-and-forget — a notification failure never breaks the submission.

### Sentry error monitoring

The API initialises `@sentry/nestjs` from `src/sentry/instrument.ts`, imported as the very first line of `src/main.ts`.

- **Disabled by default**: set `SENTRY_DSN` to enable.
- **Filtered**: 4xx HTTP responses are dropped before send (`beforeSend`). Only 5xx and uncaught exceptions reach Sentry.
- **Enriched**: `AllExceptionsFilter` adds request path, method, and user agent tags on every captured 5xx.
- Tunable: `SENTRY_TRACES_SAMPLE_RATE` (default `0.1`) and `SENTRY_PROFILES_SAMPLE_RATE` (default `0`).

## 🗃 Database Schema & Prisma

The schema (`prisma/schema.prisma`) contains 22+ models (`User`, `SellerProfile`, `Product`, `Order`, `Transaction`, `PaymentLedgerEntry`, `AdminApproval`, `AuditLog`, etc.). To update the schema:

1. Edit `prisma/schema.prisma`.
2. Run `pnpm --filter @vendly/api exec prisma migrate dev --name <migration_name>`.

## 🐳 Docker Deployment

The API includes a multi-stage Dockerfile (Node 20 Alpine) running as a non-root user (`appuser`). It runs `prisma migrate deploy` on startup and exposes port 1000.

## 🌐 API Interaction & Security

The API runs on port 1000 by default.

- **CORS**: Whitelisted for the official Web & Admin frontends.
- **Rate Limiting**: Enforced globally via `@nestjs/throttler`, with per-route overrides for AI search and auth endpoints.
- **Validation**: All incoming requests are validated using `class-validator` pipes.

For detailed endpoint documentation, see the [API Reference](../../API_REFERENCE.md).
