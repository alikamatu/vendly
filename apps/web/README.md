# Verndly Web Storefront

The primary marketplace frontend for Verndly, where buyers discover products with Verndly AI and entrepreneurs manage their storefronts and catalogs.

## 🚀 Getting Started

### Installation

1. **Dependencies**: From the root of the monorepo, run:
   ```bash
   pnpm install
   ```
2. **Environment Setup**:
   Navigate to the web directory and create a `.env.local` file:
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```
   Ensure `NEXT_PUBLIC_API_URL` points to your running API (default is `http://localhost:1000`).

## 🛠 Available Scripts

Run these from the monorepo root using Turborepo filters:

- `pnpm --filter @vendly/web dev`: Starts the Next.js development server (port 3000).
- `pnpm --filter @vendly/web build`: Compiles the application for production.
- `pnpm --filter @vendly/web lint`: Runs ESLint to check for code quality.

## ✨ Key Features

- **Full-Bleed Product Browser & Verndly AI Shopper (`/products`)**: Edge-to-edge responsive masonry grid (`columns-2` to `2xl:columns-6`), hidden-by-default filter drawer toggleable on demand (`MobileFilterDrawer` / `FiltersPanel`), 1-tap category pills, and `VerndlyAiShopBar` for natural-language shopping queries.
- **Swipeable Product Detail & Right-Sidebar Buy Now**: Touch-swipeable mobile product photo gallery (`ProductDetailClient.tsx`) with live drag feedback and directional transitions, plus a full-height right-hand sidebar Buy Now drawer (`QuickCheckoutModal.tsx`).
- **Seller Self-Purchase Protection**: `lib/utils/ownership.ts` prevents sellers from adding or checking out their own listings across cards, cart, PDP, and checkout, replacing buy controls with **Manage Product**.
- **Multi-Channel Seller Product Importers (`/dashboard/products/new`)**:
  - **Upload Product (Verndly AI)**: Drag-and-drop photo listing & bulk grouping with AI title, description, category, and GH₵ price drafting.
  - **From Website (`WebsiteImportPanel.tsx`)**: Paste a store URL or product link(s) to preview & import items with `RemoteProductThumb` authenticated proxy thumbnails, automatic Verndly category mapping, and individual photo add/remove controls.
  - **From WhatsApp (`WhatsAppImportPanel.tsx`)**: Upload WhatsApp Business catalog screenshots (automatically cropping each product's photo on `<canvas>` from Verndly AI's `image_box_2d`), paste `wa.me/p/...` links, or import Meta Commerce CSV / Graph API catalogs.
- **Kinetic Verndly AI Overlay (`VerndlyAiOverlay.tsx`)**: Minimal dim backdrop with floating `VerndlyAiIcon` and crisp white kinetic typing pill (`verndly-char-in` + `verndly-caret`), built with deterministic CSS fade + synchronous `pointer-events-none` unmount so overlays never block interaction after errors.
- **Unified Alerts & Borderless Tonal UI**: Consistent `<Alert />` banner component and `sonner` toasts site-wide, paired with a minimal borderless tonal dashboard and navigation.
- **Verified Profiles & Pro Share Cards**: Dedicated store pages (`/s/[slug]`) and `GET /api/cards/product/<id>` rendering a 4:5 portrait PNG (2160×2700 retina) share card for Pro sellers.
- **SEO Optimized**: Dynamic sitemap generation, `robots.txt`, OG/Twitter images, and Organization/Product JSON-LD integration.

## 🛡 Security Headers

`next.config.ts` ships a strict response-header policy on every route:

- **Content-Security-Policy** allowing `'self'`, `https:` and `blob:` images (for Cloudinary, local crops, and authenticated proxied importer thumbnails), Paystack JS + iframe, the API host (from `NEXT_PUBLIC_API_URL`), and Google fonts. Dev mode loosens `script-src` (eval) and `connect-src` (ws/localhost) so HMR keeps working.
- **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**.
- **Strict-Transport-Security**: 2 years, `includeSubDomains`, `preload`.
- **Permissions-Policy**: camera/mic/geolocation disabled, payment scoped to `self`.

When adding a new third-party host (analytics, payment widget, font CDN), extend the constants at the top of `next.config.ts` rather than weakening the policy.

## 🐞 Error Monitoring (Sentry)

`@sentry/nextjs` is wired across all three runtimes:

- **Client** (`sentry.client.config.ts`): browser errors + session replay on errors (100% on error, 0% on normal sessions).
- **Server** (`sentry.server.config.ts`): RSC, API routes, server actions.
- **Edge** (`sentry.edge.config.ts`): middleware and edge functions.

`instrumentation.ts` boots the right config per runtime and re-exports `captureRequestError`. `app/global-error.tsx` captures React render crashes, and production traffic is tunneled via `/monitoring/*` (`withSentryConfig({ tunnelRoute })`).

To enable, set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` for source maps). With no DSN set, the SDK is a no-op.

## 🏗 Tech & Architecture

- **Next.js 16+ (App Router)**: 23+ dynamic routes spanning auth, storefronts, seller dashboards, importers, and legal pages.
- **Framer Motion**: Smooth transitions for drawers, tabs, and galleries.
- **Zustand**: Lightweight global state for cart and user sessions.
- **Tailwind CSS v4**: Utility-first styling with Verndly's tonal design tokens (`bg-surface`, `bg-background`).
- **Forms & Validation**: `react-hook-form` + `zod`.
- **Utilities**: `sonner` for toasts, `browser-image-compression` for client-side uploads, and `qrcode.react` for store sharing.

### Component Structure

The `components/` directory is grouped by domain: `ai`, `auth`, `common`, `dashboard`, `home`, `layout`, `product-detail`, `products`, `products-browser`, `reviews`, `seo`, `settings`, `stores-browser`, and reusable primitives in `ui`.

### Hooks & Lib

Custom React hooks (`useAuth`, `useProductsBrowser`, etc.), ownership helpers (`lib/utils/ownership.ts`), and typed API clients (`lib/api/`) abstract data fetching and state management.
