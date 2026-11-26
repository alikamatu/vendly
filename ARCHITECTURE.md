# Verndly Architecture Overview

This document provides a technical overview of the Verndly platform architecture, covering the data layer, NestJS API modules, Verndly AI & multi-channel product ingestion pipelines, Next.js storefront architecture, and external integrations.

## 🏛 System Design

Verndly is a pnpm + Turborepo monorepo with a clear separation of concerns across the data layer, backend services, and web/admin/mobile presentation layers.

### 1. Data Layer (Prisma & PostgreSQL)

The Prisma schema (`apps/api/prisma/schema.prisma`) is the source of truth across 22+ models:

- **User ↔ SellerProfile**: 1:1 relationship elevating verified users to sellers with store metadata, slugs, and payout details.
- **SellerProfile ↔ Product**: 1:N listings with dynamic category metadata (`seed-categories.js` seeds 15 canonical Verndly categories), Cloudinary media arrays, and promotion flags.
- **Product ↔ ProductVariant**: SKU, size, and color variants.
- **Order ↔ OrderItem**: 1:N order and basket management with escrow status tracking.
- **Transaction ↔ PaymentLog ↔ Payout ↔ PaymentLedgerEntry**: Double-entry financial ledger for split payments, atomic webhook deduplication (`payment_logs.event_id`), and seller payouts.
- **Review ↔ ReviewFlag**: Verified-purchase reviews and moderation flags.
- **ReturnRequest**: Return request lifecycle and dispute resolution states.
- **AdminApproval**: Seller verification document tracking and review decisions.
- **AuditLog**: Append-only audit trail for consequential admin and seller actions.
- **PlatformSetting**: Dynamic key-value platform configuration.

### 2. Backend Logic (NestJS — `apps/api`)

The API is organized into 23 feature-based modules registered in `src/app.module.ts`:

- **AI Module (`src/ai/`)**: Powers **Verndly AI** via Google's Gemini API (`GeminiService` + `BuyerSearchService`). Features automatic sticky failover across Flash / Flash-Lite models on 503/429/timeout spikes, a `fast` mode for sub-5s buyer search (with 5-minute category caching, 5-minute LRU query-plan caching, and deterministic keyword fallback), single & bulk photo-to-listing analysis, listing copy polishing, storefront setup drafting, and WhatsApp catalog screenshot vision parsing with normalized 2D bounding boxes (`image_box_2d`).
- **Product, Category & Brand Modules (`src/product/`, `src/category/`, `src/brand/`)**: Listings CRUD, dynamic category fields, Cloudinary media uploads/mirroring, SKU variants, bulk CSV import, **Website Product Importer** (`website-import.service.ts`), **WhatsApp Catalog Importer** (`whatsapp-catalog.service.ts`), and shared semantic category resolution (`category-matcher.ts`).
- **Auth Module (`src/auth/`)**: JWT issuance, Bcrypt hashing, Google OAuth, 2FA (TOTP + SMS via Arkesel), token blacklisting on logout, and seller verification submission.
- **Admin Module (`src/admin/`)**: Centralized back-office endpoints for seller approvals, user moderation, returns, reviews, and financial reconciliation.
- **Store, Analytics & Subscription Modules**: Storefront customization, URL slugs, Pro vendor rankings, store metrics, and Pro subscriptions.
- **Order & Payments Modules (`src/order/`, `src/payments/`)**: Checkout orchestration, seller self-purchase prevention (`ForbiddenException` when `seller.user_id === userId`), Paystack split payments, subaccounts, and automated payout runs.
- **Notification, Email, Loops & Events Modules**: Transactional emails via Resend, audience/product-update automations via Loops.so, 16 in-app notification types, and event hooks.
- **Audit & Observability (`src/audit/`, `src/sentry/`)**: Fire-and-forget audit logging and Sentry 5xx error monitoring (`src/sentry/instrument.ts` loaded before all Nest modules).

**Security Architecture**:

- CORS whitelisting, Helmet headers, strict `class-validator` DTO pipes, global exception filtering, and standardized `{ data, meta }` responses via `ApiResponseInterceptor`.
- SSRF protection (`validatePublicWebsiteUrl`) blocking localhost, loopback, link-local metadata endpoints, and private RFC-1918 IP ranges across website imports and the authenticated preview image proxy.
- Raster magic-byte sniffing (`JPEG`, `PNG`, `GIF`, `WebP`, `AVIF`) on both `/products/website-import/image-proxy` and `CloudinaryService.uploadImageFromUrl`.
- **Caching Layer**: Redis via `@nestjs/cache-manager` (categories, top pro stores) with graceful in-memory fallback when `REDIS_URL` is unset or unreachable.
- **Rate Limiting**: Global `@nestjs/throttler` guard with route-specific limits (e.g., `/ai/buyer-search` at 20 req/min, tighter limits on login and password recovery).

### 3. Frontend Architecture (Next.js — `apps/web`)

The Web Storefront uses Next.js 16+ App Router with Tailwind CSS v4:

- **Full-Bleed Product Browser (`/products`)**: Edge-to-edge responsive masonry (`columns-2` up to `2xl:columns-6`), hidden-by-default on-demand filter drawer (`MobileFilterDrawer` / `FiltersPanel`), quick category pills, and integrated **Verndly AI Shopper** (`VerndlyAiShopBar`) with 1-tap natural-language shopping prompts.
- **Product Detail & Checkout UX**: Touch-swipeable mobile image gallery (`ProductDetailClient.tsx`) with live drag feedback and slide transitions, full-height right-hand sidebar Buy Now drawer (`QuickCheckoutModal.tsx`), and ownership guards (`lib/utils/ownership.ts`) that block self-purchase and show **Manage Product** for owners across product cards, cart, PDP, and checkout.
- **Verndly AI Visual Surfaces**: Branded `<VerndlyAiIcon />` and `<VerndlyAiOverlay />` using deterministic CSS transitions (synchronous `pointer-events-none` on dismiss + clean unmount to prevent click-blocking layers), dim backdrop, floating orb, and white pill with character-by-character typing animation.
- **Unified Alerts & Tonal Design System**: Site-wide `<Alert />` component and `sonner` toasts for all inline/transient feedback, plus a borderless tonal layout across the seller dashboard, navbar, and importers.
- **SEO Infrastructure**: Dynamic sitemaps, `robots.txt`, OpenGraph/Twitter share cards (`/api/cards/product/:id`), and JSON-LD structured data.

---

## 🔄 Core Data Flows

### 1. Verndly AI Buyer Shopping Search

1. **Buyer** enters a natural-language query in `VerndlyAiShopBar` (e.g. `"gift for my girlfriend under 200 cedis"`).
2. **`BuyerSearchService`** checks its 5-minute LRU query-plan cache; on cache miss it calls `GeminiService.parseBuyerSearchQuery` in `fast` mode (`gemini-3.5-flash-lite` first, `4.5s` per-model timeout, `5s` total budget) using cached Verndly category names.
3. If the AI model is slow or unavailable, `BuyerSearchService` falls back immediately to deterministic keyword/price/category extraction so search never stalls.
4. Parsed filters (`keywords`, `category`, `min_price`, `max_price`, `condition`, `sort`, `in_stock_only`) execute against PostgreSQL via Prisma and return matched products alongside a 1-sentence Verndly AI summary.

### 2. Website Product Import Flow (`/products/website-import`)

1. **Seller** pastes a store homepage, collection URL, or one or more individual product URLs (`Auto-detect`, `Single item`, or `Owned website`).
2. **`WebsiteImportService`** validates public HTTPS URLs (`validatePublicWebsiteUrl`) and runs an ordered extraction cascade:
   - **Shopify JSON** (`/products/<handle>.json`, `/collections/<handle>/products.json`, `/products.json`) and **WooCommerce Store API** (`/wp-json/wc/store/v1/products`).
   - **Structured HTML**: Schema.org JSON-LD (`Product`, `ProductGroup`, `ItemList`, `BreadcrumbList`, Yoast/RankMath `@graph` `@id` dereferencing, and recursive `ImageObject.contentUrl` array unwrapping for marketplaces like Jumia), `__NEXT_DATA__`, strict product-only OpenGraph/meta fallback, and high-res gallery enrichment (`extractBestImageFromTag`, `srcset`, `/_next/image` unwrapping).
   - **Client-Rendered SPA Discovery**: Inspects up to 18 same-origin Next.js/React/Vite script chunks (prioritizing route and shared app chunks), extracts backend API origins & `/api` prefixes, probes JSON endpoints in parallel, and maps `priceCents`/`GHC -> GHS` payloads.
   - **Verndly AI DOM Reader**: Product-focused DOM digest fallback preserving inline `[IMG: ...]` anchors.
3. **Semantic Category Resolution (`category-matcher.ts`)**: Scores raw category, breadcrumbs (ignoring generic root `"Home"`), tags, title, brand, URL slug, and description across all 15 Verndly categories.
4. **Preview & Permanent Commit**: `RemoteProductThumb` previews remote images via authenticated `GET /products/website-import/image-proxy` (bypassing merchant hotlink blocks and strict CSP). On commit, `CloudinaryService.uploadImageFromUrl` mirrors up to 3 photos per item permanently to Cloudinary (with direct Cloudinary remote-fetch fallback on `401/403/406/429`).

### 3. WhatsApp Catalog Import Flow (`/products/whatsapp-import`)

- **Screenshots (Verndly AI)**: Seller uploads up to 10 WhatsApp Business catalog screenshots. `GeminiService.parseWhatsAppCatalogScreenshots` extracts deduplicated items along with `source_screenshot_index` and normalized `[ymin, xmin, ymax, xmax]` (`0..1000`) `image_box_2d` coordinates. `WhatsAppImportPanel` crops each product photo from the original uploaded screenshot via offscreen `<canvas>`, attaches it to the review queue, and uploads it to Cloudinary on commit.
- **WhatsApp Links (`wa.me/p/...`, `wa.me/c/...`, phone numbers)**: `WhatsAppCatalogService.fetchWhatsAppPageHtml` resolves `wa.me/p/...` directly to `www.whatsapp.com/product/.../?app_absent=0` using official link-preview user agents (`WhatsApp/2.24.6.77`, fallback `facebookexternalhit/1.1`), cleans `<Title> from <Shop> on WhatsApp.`, decodes numeric/hex HTML entities (`&#xb7;`), extracts currency-anchored prices, resolves the Verndly category via `category-matcher.ts`, and mirrors `fbcdn.net` images to Cloudinary on commit.
- **Meta Commerce CSV & Graph API**: Supports bulk CSV uploads and direct Meta Commerce Catalog Graph API sync (`v21.0`).

### 4. Ordering, Self-Purchase Guard & Payment Flow

1. **Buyer** adds products to cart or opens the right-sidebar Buy Now drawer (`QuickCheckoutModal`).
2. **Ownership Check**: Both the web UI (`lib/utils/ownership.ts`) and backend (`OrderService.createOrder`) reject attempts by a seller to purchase their own listings (`403 Forbidden`).
3. **Checkout** initializes a Paystack transaction via `/payments/initialize` or `/orders`.
4. **Paystack Webhook** (`/webhooks/paystack`) verifies the raw-body HMAC-SHA512 signature with `crypto.timingSafeEqual`, atomically dedupes on `payment_logs.event_id`, records the `Transaction` & `PaymentLedgerEntry`, updates order state, and deducts stock.

### 5. Seller Verification, 2FA & Return Flows

- **Seller Verification**: User submits documents (`POST /auth/submit-verification`) → API creates `AdminApproval` and fires Resend email + Arkesel SMS admin alerts → Admin approves via `/admin/approve/:id` → role elevated to `SELLER` and `SellerProfile` created.
- **2FA**: Supports TOTP (QR secret + hashed backup codes) and SMS OTP via Arkesel; login issues a temporary challenge token until 2FA succeeds.
- **Returns**: Buyer submits a `ReturnRequest` within the escrow window; seller/admin reviews and transitions status (`Approved`, `Rejected`, `Refunded`).

---

## 🛠 External Integrations

- **Google Gemini API (Verndly AI)**: Vision & structured-JSON model chain (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`) powering buyer search, photo-to-listing, listing polish, storefront drafting, and catalog extraction.
- **Cloudinary**: Permanent media storage, remote URL mirroring, and optimized delivery for product photos and videos.
- **Paystack**: Checkout payments, split subaccounts, webhooks, and automated seller payouts.
- **Resend**: Template-based transactional emails.
- **Loops.so**: Newsletter, product updates, and audience automations.
- **Arkesel**: SMS OTP delivery for 2FA and admin verification alerts.
- **Sentry**: Production error tracking across API (`@sentry/nestjs`) and Web (`@sentry/nextjs` client/server/edge with `/monitoring/*` tunnel).

---

## 🚀 Performance Optimizations

- **AI Search Caching & Fast Failover**: 5-minute category cache, 5-minute LRU query-plan cache, sticky healthy-model promotion, and 5s search budget with deterministic fallback.
- **Multi-Layer Data Caching**: Redis caching (with automatic in-memory fallback) for categories and top Pro stores.
- **Client-Side Image Compression & Cropping**: `browser-image-compression` shrinks seller uploads before network transfer; WhatsApp screenshot crops happen locally on `<canvas>` with zero wasted CDN uploads for discarded items.
- **Database Indexing**: Critical lookup columns (`product.category`, `store_link`, `payment_logs.event_id`) are indexed for fast queries.
