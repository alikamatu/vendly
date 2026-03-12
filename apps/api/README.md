<![CDATA[# 🔧 Vendly API

> NestJS 11 REST API powering the Vendly campus marketplace.

---

## Quick Start

```bash
npm install
npx prisma generate
npx prisma db push
npm run start:dev          # http://localhost:1000
```

---

## Architecture

```
src/
├── auth/                  # Authentication & authorization
│   ├── auth.controller.ts       # /auth endpoints
│   ├── auth.service.ts          # Register, login, verify, reset
│   ├── admin.controller.ts      # /admin endpoints
│   ├── admin.service.ts         # Approval workflow, stats
│   ├── dto/                     # Request validation DTOs
│   ├── guards/                  # JwtAuthGuard, RolesGuard
│   └── strategies/              # Passport JWT strategy
│
├── product/               # Product management
│   ├── product.controller.ts    # /products endpoints
│   ├── product.service.ts       # CRUD, search, categories
│   └── dto/                     # CreateProductDto, UpdateProductDto
│
├── store/                 # Seller store management
│   ├── store.controller.ts      # /stores endpoints
│   ├── store.service.ts         # Create, update, stats, public lookup
│   └── dto/                     # CreateStoreDto, UpdateStoreDto
│
├── order/                 # Order lifecycle
│   ├── order.controller.ts      # /orders endpoints
│   ├── order.service.ts         # Create, buyer/seller views, status
│   └── dto/                     # CreateOrderDto
│
├── favorite/              # Wishlist / favorites
│   ├── favorite.controller.ts   # /favorites endpoints
│   ├── favorite.service.ts      # Toggle, list, IDs
│   └── favorite.module.ts
│
├── email/                 # Transactional emails
│   ├── email.service.ts         # Resend integration
│   └── email.module.ts
│
├── common/                # Shared utilities
│   ├── cloudinary.service.ts    # Image/video upload
│   ├── cloudinary.module.ts
│   └── filters/                 # Global exception filter
│
├── prisma/                # Database client
│   ├── prisma.service.ts        # PrismaClient with PG adapter
│   └── prisma.module.ts
│
├── app.module.ts          # Root module
├── app.controller.ts      # Health check
└── main.ts                # Bootstrap & CORS config
```

---

## Modules

| Module | Prefix | Description |
|---|---|---|
| **AuthModule** | `/auth` | JWT authentication, email verification, password reset, profile management |
| **AdminModule** | `/admin` | Seller verification approvals, platform statistics (ADMIN role only) |
| **StoreModule** | `/stores` | Seller store CRUD with Cloudinary logo uploads |
| **ProductModule** | `/products` | Product CRUD with multi-image/video upload, search, categories |
| **OrderModule** | `/orders` | Order creation with transactions, buyer/seller views, status updates |
| **FavoriteModule** | `/favorites` | Toggle favorites, list user favorites, get favorite product IDs |
| **EmailModule** | — | Transactional emails via Resend (verification, password reset) |
| **CloudinaryModule** | — | Image upload service shared across modules |
| **PrismaModule** | — | Database client with PostgreSQL driver adapter |

---

## Authentication

- **Strategy:** JWT (Bearer token) via `@nestjs/passport`
- **Token Storage:** Client-side (`localStorage` key: `vendly_token`)
- **Guards:**
  - `JwtAuthGuard` — Validates JWT on protected routes
  - `RolesGuard` + `@Roles()` — Role-based access control (USER, SELLER, ADMIN)
- **Rate Limiting:** Login endpoint throttled to 5 requests per minute via `@nestjs/throttler`
- **Logout:** In-memory token blacklist (use Redis in production)

---

## Database

### Prisma 7 Configuration

Prisma 7 moved database URLs from `schema.prisma` to `prisma.config.js`:

```js
// prisma.config.js
module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL,  // Direct connection for migrations
  },
});
```

> **Supabase Note:** Use port `5432` (direct) for `prisma db push` / migrations, and port `6543` (pooled via PgBouncer) for runtime queries in `PrismaService`.

### Models

| Model | Table | Key Relations |
|---|---|---|
| `User` | `users` | → SellerProfile, Orders, Favorites, AdminApprovals |
| `SellerProfile` | `seller_profiles` | → User, Products |
| `Product` | `products` | → SellerProfile, OrderItems, Favorites |
| `Order` | `orders` | → User (buyer), OrderItems |
| `OrderItem` | `order_items` | → Order, Product |
| `Category` | `categories` | Standalone |
| `AdminApproval` | `admin_approvals` | → User (applicant), User (reviewer) |
| `Favorite` | `favorites` | → User, Product (unique constraint) |

---

## Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start with hot-reload (watch mode) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled production build |
| `npm run lint` | Run ESLint with auto-fix |
| `npm test` | Run Jest unit tests |

---

## CORS

Configured in `main.ts` to allow:
- `FRONTEND_URL` (default: `http://localhost:3000`)
- `ADMIN_URL` (default: `http://localhost:3001`)

Both with `credentials: true` for cookie/header-based auth.

---

## Error Handling

A global `AllExceptionsFilter` catches all exceptions and returns consistent JSON:

```json
{
  "statusCode": 500,
  "timestamp": "2026-03-12T12:00:00.000Z",
  "path": "/some/endpoint",
  "message": ["Error description"]
}
```

---

## BigInt Serialization

BigInt values (used for IDs) are automatically serialized to strings via a global prototype patch in `main.ts`:

```ts
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
```
]]>
