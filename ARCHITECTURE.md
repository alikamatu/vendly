# Verndly Architecture Overview

This document provides a deep dive into the technical architecture of the Verndly platform, explaining the design decisions and data flows that power the marketplace.

## 🏛 System Design

Verndly is designed as a distributed system with a clear separation of concerns between the data layer, business logic, and presentation layers.

### 1. Data Layer (Prisma & PostgreSQL)
The schema is the source of truth for the application. The Prisma schema includes over 22 models. Key entities and relationships include:
-   **User ↔ SellerProfile**: A 1:1 relationship where users can elevate to seller status upon approval.
-   **SellerProfile ↔ Product**: A 1:N relationship allowing sellers to list multiple products.
-   **Product ↔ ProductVariant**: SKUs, sizes, and colors for specific listings.
-   **Order ↔ OrderItem**: A 1:N relationship for complex basket management.
-   **Transaction ↔ PaymentLog ↔ Payout ↔ PaymentLedgerEntry**: A double-entry financial ledger for managing split payments and vendor payouts.
-   **Review ↔ ReviewFlag**: Verified purchase reviews with a moderation flagging system.
-   **ReturnRequest**: Workflows for order returns and tracking statuses.
-   **AdminApproval**: Tracks the verification state of users applying for seller roles.
-   **PlatformSetting**: Key-value pairs for dynamic platform configurations.

### 2. Backend Logic (NestJS)
The API is divided into 18 feature-based modules:
-   **Auth Module**: Handles JWT issuance, password hashing (Bcrypt), OAuth (Google), and 2FA (TOTP + SMS via Arkesel). Includes token blacklisting on logout.
-   **Admin Module**: Centralized back-office functionality built into the API (approvals, user management, reconciliation).
-   **Product & Category Modules**: Manages listings, dynamic category fields, Cloudinary media uploads, SKU variants, and bulk CSV import.
-   **Store & Subscription Modules**: Handles store metadata, analytics, link slugs, and Pro seller subscription features.
-   **Order & Payments Modules**: Manages the transactional flow from checkout to fulfillment, integrating with Paystack for split payments, subaccounts, and payout handling.
-   **Notification & Email Modules**: Delivers transactional emails via Resend and handles 16 distinct in-app notification types.

**Security Architecture**: Includes CORS whitelisting, Helmet for security headers, strict validation pipes (class-validator), global exception filters for sanitized responses, and API response interceptors that wrap all responses in a `{ data, meta }` format.
**Caching Layer**: Utilizes Redis (`@nestjs/cache-manager`) for high-performance caching (e.g., categories, top pro vendors), with a graceful fallback to in-memory caching.
**Rate Limiting**: Configured globally with tighter limits on sensitive endpoints (e.g., login, password reset).

### 3. Frontend Architecture (Next.js)
The Web app leverages Next.js for a performant buyer and seller experience:
-   **App Router**: For nested layouts, server-side optimization, and 23+ dynamic routes.
-   **Server Components**: Used for initial data fetching to reduce client-side bundle size.
-   **Client Components**: Used for interactive elements (Cart, Search, Profile Dropdowns, Forms with react-hook-form + zod).
-   **SEO Infrastructure**: Generates dynamic sitemaps, robots.txt, OG/Twitter images, and JSON-LD structured data for rich search engine snippets.

## 🔄 Data Flow

### Seller Verification Flow
1.  **User** submits verification documents (ID, business docs) via the Web onboarding flow.
2.  **API** creates an `AdminApproval` record and stores documents securely.
3.  **Admin** reviews the request via Admin API endpoints.
4.  **API** updates the user's role to `SELLER`, creates a `SellerProfile`, and triggers a notification.

### Ordering & Payment Flow
1.  **Buyer** adds products to the cart (managed via Zustand in the browser).
2.  **Checkout** initiates a Paystack transaction via the API.
3.  **Paystack** processes payment; buyer completes flow on frontend.
4.  **Webhook** from Paystack hits the API (`/webhooks/paystack`) confirming success.
5.  **API** creates `Order` and `OrderItem` records, records the `Transaction`, and deducts stock.
6.  Funds are routed via split payments to the platform and the seller's subaccount, tracked in the `PaymentLedgerEntry`.

### 2FA Authentication Flow
1.  **User** initiates 2FA setup (TOTP or SMS).
2.  **API** generates a secret and provides a QR code (TOTP) or sends an OTP (SMS).
3.  **User** verifies the code to enable 2FA. Backup codes are generated and returned (hashed in DB).
4.  On next login, standard credentials return a temporary token; full JWT is issued only after 2FA challenge is passed.

### Return Request Flow
1.  **Buyer** submits a return request for a fulfilled order item within the allowable window.
2.  **API** creates a `ReturnRequest` and notifies the seller.
3.  **Seller/Admin** reviews and updates the status (Approved, Rejected, Refunded).

## 🛠 External Integrations

-   **Cloudinary**: Used for optimized delivery, transformation, and storage of product images and videos.
-   **Resend**: Powers all transactional emails with template-based rendering.
-   **Paystack**: Handles all payment processing, merchant subaccounts, and automated transfers.
-   **Arkesel**: SMS gateway for sending OTPs for 2FA.
-   **Prisma Client**: Ensures type-safe database interactions across the entire backend.

## 🚀 Performance Optimizations

-   **Image/Video Previews**: Videos are muted and auto-played for high engagement without blocking main thread interactions. Images use Next.js optimization.
-   **Optimistic UI**: Framer Motion and Zustand provide immediate feedback for actions like "Favoriting".
-   **Database Indexing**: Critical fields like `product.category` and `store_link` are indexed for sub-millisecond lookups.
-   **Tree-shaking**: Frontend dependencies like `lucide-react` and `framer-motion` are optimized to reduce bundle sizes.
