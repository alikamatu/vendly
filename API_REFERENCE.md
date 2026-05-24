# Vendly API Reference

This document provides a comprehensive overview of the Vendly REST API endpoints.

## Base URL
All API requests should be made to the base URL configured in your environment (default: `http://localhost:1000`).

## Authentication
Most protected routes require a JWT bearer token.
- **Header**: `Authorization: Bearer <token>`
- **Roles**: `USER`, `SELLER`, `ADMIN`

## Rate Limiting
Global rate limiting is enforced (10 requests per 60 seconds). Certain endpoints have stricter limits (e.g., login: 10/min, password reset/recovery: 2/5min).

## Response Format
All successful responses are wrapped in a standard format:
```json
{
  "data": { ... },
  "meta": { ... } // Optional pagination/metadata
}
```

---

## Endpoints by Module

### Auth & Security (`/auth`)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login (returns temporary token if 2FA enabled) |
| GET | `/auth/me` | JWT | Get current user profile |
| POST | `/auth/verify-email` | No | Verify email address |
| POST | `/auth/resend-verification` | No | Resend email verification code |
| POST | `/auth/find-account` | No | Account recovery start |
| GET | `/auth/oauth/google/start` | No | Initiate Google OAuth flow |
| GET | `/auth/oauth/google/callback` | No | Google OAuth callback handler |
| POST | `/auth/forgot-password` | No | Request password reset email |
| POST | `/auth/reset-password` | No | Reset password with token |
| POST | `/auth/submit-verification` | JWT | Submit documents for seller approval |
| GET | `/auth/approval-status` | JWT | Check seller approval status |
| POST | `/auth/logout` | JWT | Logout and blacklist token |
| PATCH | `/auth/profile` | JWT | Update user profile |
| GET | `/auth/export-data` | JWT | Export all user data (GDPR) |
| DELETE | `/auth/account` | JWT | Delete user account |

#### 2FA Routes
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/auth/2fa/status` | JWT | Check 2FA enablement status |
| POST | `/auth/2fa/setup` | JWT | Setup TOTP (returns QR code secret) |
| POST | `/auth/2fa/enable` | JWT | Verify and enable TOTP |
| POST | `/auth/2fa/disable` | JWT | Disable 2FA |
| POST | `/auth/2fa/backup-codes/regenerate` | JWT | Regenerate backup recovery codes |
| POST | `/auth/2fa/sms/setup` | JWT | Setup SMS 2FA |
| POST | `/auth/2fa/sms/enable` | JWT | Verify and enable SMS 2FA |
| POST | `/auth/2fa/sms/resend` | No | Resend SMS OTP |

### Admin (`/admin`) — *Requires ADMIN Role*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/overview` | Global platform metrics |
| GET | `/admin/stats` | Detailed statistics |
| GET | `/admin/transactions` | List all payment transactions |
| GET | `/admin/approvals` | List pending seller verifications |
| GET | `/admin/approvals/:id` | Get specific approval details |
| PATCH | `/admin/approve/:id` | Approve or reject a seller application |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:id` | Get specific user details |
| PATCH | `/admin/users/:id/role` | Update user role |
| PATCH | `/admin/users/:id/toggle-suspension` | Suspend or unsuspend a user |
| PATCH | `/admin/users/:id/warn` | Issue a warning to a user |
| PATCH | `/admin/users/:id/delete` | Hard delete a user |
| PATCH | `/admin/users/:id/disable-2fa` | Force disable 2FA for a user |
| PATCH | `/admin/users/:id/pro` | Toggle pro subscription status manually |
| GET | `/admin/returns` | List all return requests |
| PATCH | `/admin/returns/:id` | Update status of a return request |
| GET | `/admin/reviews` | List flagged/all reviews |
| PATCH | `/admin/reviews/:id/moderate` | Moderate (approve/delete) a review |

### Store (`/stores`)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/stores` | SELLER | Create a new store profile |
| PATCH | `/stores` | SELLER | Update existing store details |
| GET | `/stores/stats` | SELLER | Get store performance statistics |
| GET | `/stores/link/:link` | No | Get public store profile by URL slug |
| GET | `/stores/top-pro` | No | Get top Pro vendors (Cached) |
| GET | `/stores` | No | List and filter all stores |

### Product (`/products`)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/products` | SELLER | Create a new product listing |
| POST | `/products/bulk-import` | SELLER | Upload CSV for bulk product creation |
| GET | `/products/categories` | No | List all categories (Cached) |
| GET | `/products/search` | No | Search products by query |
| GET | `/products` | No | List and filter products |
| GET | `/products/recent` | No | Get recently added products |
| GET | `/products/:id` | No | Get product details |
| GET | `/products/store/:link` | No | Get all products for a specific store |
| GET | `/products/seller/me` | SELLER | Get all products owned by current seller |
| PUT | `/products/:id` | SELLER | Update a product listing |
| POST | `/products/:id/duplicate` | SELLER | Duplicate an existing product |
| DELETE | `/products/:id` | SELLER | Delete a product |

#### Promotions & Hot Sales
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| PATCH | `/products/:id/hot-sales` | SELLER | Toggle hot sales status |
| POST | `/products/:id/hot-sales/initialize-payment` | SELLER | Initialize payment to feature product |
| GET | `/products/hot-sales/verify` | SELLER | Verify hot sales payment |
| POST | `/products/:id/promotions/initialize-payment` | SELLER | Initialize general promotion payment |
| GET | `/products/promotions/verify` | SELLER | Verify promotion payment |
| GET | `/products/promotions/history` | SELLER | View promotion payment history |

### Order (`/orders`)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/orders` | JWT | Create a new order |
| GET | `/orders/buyer` | JWT | Get current user's order history |
| GET | `/orders/buyer/:id` | JWT | Get buyer's specific order details |
| GET | `/orders/seller` | SELLER | Get orders placed at current seller's store |
| GET | `/orders/verify/payment` | JWT | Verify an order payment |
| GET | `/orders/:id` | JWT | Get general order details |
| POST | `/orders/:id/status` | SELLER/ADMIN | Update order fulfillment status |
| POST | `/orders/:id/retry-payment` | JWT | Retry payment for a failed order |
| POST | `/orders/:id/cancel` | JWT | Cancel an order |
| POST | `/orders/:id/return` | JWT | Submit a return request |
| POST | `/orders/:id/return/status` | SELLER/ADMIN | Update return request status |

### Payment (`/payments`)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/payments/status` | No | Payment gateway health check |
| POST | `/payments/initialize` | JWT | Initialize a Paystack transaction |
| GET | `/payments/verify/:reference` | JWT | Verify transaction via reference |
| GET | `/payments/transactions` | SELLER/ADMIN | List user's transactions |
| GET | `/payments/transactions/:id` | SELLER/ADMIN | Transaction details |
| POST | `/payments/transactions/:id/reconcile` | ADMIN | Reconcile a problematic transaction |
| GET | `/payments/payouts` | SELLER/ADMIN | List vendor payouts |
| POST | `/payments/payouts/run` | ADMIN | Trigger manual payout run |
| POST | `/payments/payouts/:id/retry` | SELLER/ADMIN | Retry a failed/pending payout (audit-logged) |
| GET | `/payments/history` | SELLER/ADMIN | Unified payment history log |

### Webhooks (`/webhooks`)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/webhooks/paystack` | HMAC Signature | Paystack event webhook. Requires raw body; signature is verified with `crypto.timingSafeEqual`; dedupe is atomic on `payment_logs.event_id`. Requests without `data.id` / `data.reference` are rejected so replay protection can't be bypassed. |

### Audit Log (`/audit-logs`)
Append-only record of consequential admin + seller actions. Writes happen server-side only; this API is read-only.

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/audit-logs` | ADMIN/SELLER | List audit entries. Admins can filter by any actor; sellers are forced to their own `actor_id`. Query params: `actorId`, `entityType`, `entityId`, `action`, `from`, `to`, `page`, `limit`. |
| GET | `/audit-logs/me` | Any | Current user's own actions (paginated). |

**Actions emitted**: `user.role_change`, `user.suspend`, `user.unsuspend`, `user.warn`, `user.delete`, `approval.approve`, `approval.reject`, `product.create`, `product.update`, `product.delete`, `product.status_change`, `product.feature`, `product.unfeature`, `product.bulk_*`, `order.status_change`, `payout.retry`, `payout.run_queue`.

### Pro Share Card (web app)
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/cards/product/:id` | No (web app) | 2160×2700 (4:5) PNG share card. Dark theme, red-500 price, optional seller badge. Cached `s-maxage=3600`. Served by `apps/web`. |
