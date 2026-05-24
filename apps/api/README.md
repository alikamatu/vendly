# Vendly API

The core backend service for the Vendly platform, built with NestJS and Prisma. Admin functionality is built directly into this API rather than as a separate application.

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- PostgreSQL
- Redis (optional, falls back to in-memory)
- Cloudinary Account
- Resend API Key
- Paystack Account

### Installation
1.  **Dependencies**: Run from the root of the monorepo:
    ```bash
    pnpm install
    ```
2.  **Environment Setup**:
    ```bash
    cd apps/api
    cp .env.example .env
    ```
    (Update the variables with your own credentials)

3.  **Database Migration & Seeding**:
    From the monorepo root:
    ```bash
    pnpm --filter @vendly/api exec prisma generate
    pnpm --filter @vendly/api exec prisma migrate dev
    pnpm --filter @vendly/api run db:seed
    ```

## 🛠 Available Scripts

Run these from the monorepo root using Turborepo filters:
-   `pnpm --filter @vendly/api dev`: Starts the development server with watch mode (port 1000).
-   `pnpm --filter @vendly/api build`: Builds the application for production using SWC.
-   `pnpm --filter @vendly/api test`: Runs unit tests.
-   `pnpm --filter @vendly/api lint`: Checks for linting errors.

## 🏗 Core Modules (18 Total)

-   **Auth**: JWT-based authentication, Google OAuth, 2FA (TOTP + SMS via Arkesel), role management, account recovery.
-   **Admin**: Built-in endpoints for approvals, user management, order/return moderation, and financial reconciliation.
-   **Store**: Entrepreneur store profile management and statistics.
-   **Product**: Product listing management, dynamic categories, SKU variants, Cloudinary media, and bulk CSV import.
-   **Order**: Handling checkout, status workflows, and returns.
-   **Payments**: Full Paystack integration for transactions, split payments, subaccount creation, and payouts using a double-entry ledger.
-   **Review**: Verified purchase reviews with flagging mechanism.
-   **Notification**: In-app notifications (16 distinct types).
-   **Email**: Template-based transactional emails using Resend.
-   **Subscription**: Pro seller subscription features.
-   **Common**: Shared utilities, decorators, API response interceptors, and global exception filters.
-   **Audit**: Append-only log of consequential admin + seller actions (suspensions, role changes, moderation, product CRUD, payout retries, verification approvals). Writes are fire-and-forget — see `src/audit/audit-log.service.ts`. Readable via `GET /audit-logs` (admins see everything, sellers are scoped to their own actor id).

## 🔐 Security & Webhooks

### Paystack webhook hardening (`/webhooks/paystack`)
- Refuses any request without a raw body — JSON re-serialisation breaks Paystack's HMAC signature.
- Verifies the `x-paystack-signature` header with `crypto.timingSafeEqual` against an HMAC-SHA512 of the raw body.
- Dedupes on `payment_logs.event_id` (unique constraint) atomically — duplicate deliveries get `{ received: true, duplicate: true }` without re-running side effects. The random-event-id fallback was removed.

### Admin notifications on seller verification
When a user submits a seller verification request (`POST /auth/submit-verification`), the API sends:
- An email to `ADMIN_NOTIFY_EMAIL` (falls back to `SUPPORT_EMAIL`) via Resend.
- An SMS to `ADMIN_NOTIFY_PHONE` via Arkesel (only when set + `ARKESEL_API_KEY` configured).

Both are fire-and-forget — a notification failure never breaks the submission.

## 🗃 Database Schema & Prisma

We use Prisma for type-safe database access. The schema contains 22+ models (User, SellerProfile, Product, Order, Transaction, Ledger, AdminApproval, etc.).
The schema is located at `prisma/schema.prisma`. To update the schema:
1.  Make changes to the `schema.prisma` file.
2.  Run `pnpm --filter @vendly/api exec prisma migrate dev --name <migration_name>`.

### Seeding
Custom seed scripts are available:
- `pnpm --filter @vendly/api run seed:admin`
- `pnpm --filter @vendly/api run seed:categories`
- `pnpm --filter @vendly/api run seed:locations`

## 🐳 Docker Deployment

The API includes a multi-stage Dockerfile (Node 20 Alpine) that runs as a non-root user (`appuser`). It automatically runs `prisma migrate deploy` on startup and exposes port 1000.

## 🌐 API Interaction & Security

The API runs on port 1000 by default.
- **CORS**: Whitelisted for official Web frontend.
- **Rate Limiting**: Enforced globally (10 req/min for login, etc.) via `@nestjs/throttler`.
- **Validation**: All incoming requests are strictly validated using `class-validator` pipes.

For detailed endpoint documentation, see the [API Reference](../../API_REFERENCE.md).
