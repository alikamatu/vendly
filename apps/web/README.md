# Vendly Web Storefront

The primary marketplace frontend for Vendly, where buyers explore products and entrepreneurs showcase their stores.

## 🚀 Getting Started

### Installation
1.  **Dependencies**: From the root of the monorepo, run:
    ```bash
    pnpm install
    ```
2.  **Environment Setup**:
    Navigate to the web directory and create a `.env.local` file:
    ```bash
    cd apps/web
    cp .env.example .env.local
    ```
    Ensure `NEXT_PUBLIC_API_URL` points to your running API (default is `http://localhost:1000`).

## 🛠 Available Scripts

Run these from the monorepo root using Turborepo filters:
-   `pnpm --filter @vendly/web dev`: Starts the Next.js development server (port 3000).
-   `pnpm --filter @vendly/web build`: Compiles the application for production.
-   `pnpm --filter @vendly/web lint`: Runs ESLint to check for code quality.

## ✨ Key Features

-   **Modern Hero Section**: A premium, minimal landing area to attract visitors.
-   **Verified Profiles**: Dedicated store pages for entrepreneurs (`/s/[slug]`).
-   **Dynamic Product Previews**: Auto-playing video support in search and order history.
-   **Responsive Navigation**: Optimized for mobile and desktop with a role-based profile menu.
-   **Order Tracking**: Simple and engaging order history tracking for buyers.
-   **SEO Optimized**: Dynamic sitemap generation, robots.txt, OG/Twitter images, and Organization JSON-LD integration.
-   **Pro Share Card**: `GET /api/cards/product/<id>` renders a 4:5 portrait PNG (2160×2700 retina) for pro sellers to share to social. Dark theme, red-500 price accent, slim "Free Delivery until DD/MM/YYYY" banner; sellers can override the delivery date via `product.attributes.delivery_until` (ISO date).

## 🛡 Security Headers

`next.config.ts` ships a strict response-header policy on every route:
- **Content-Security-Policy** allowing `'self'`, Cloudinary images, Paystack JS + iframe, the API host (from `NEXT_PUBLIC_API_URL`), and Google fonts. Dev mode loosens `script-src` (eval) and `connect-src` (ws/localhost) so HMR keeps working.
- **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**.
- **Strict-Transport-Security**: 2 years, `includeSubDomains`, `preload`.
- **Permissions-Policy**: camera/mic/geolocation disabled, payment scoped to `self`.

When adding a new third-party host (analytics, payment widget, font CDN), extend the constants at the top of `next.config.ts` rather than weakening the policy.

## 🐞 Error monitoring (Sentry)

`@sentry/nextjs` is wired across all three runtimes:

- **Client** (`sentry.client.config.ts`): browser errors + session replay on errors (sample rate 100% on error, 0% on session — cheap).
- **Server** (`sentry.server.config.ts`): RSC, API routes, server actions.
- **Edge** (`sentry.edge.config.ts`): middleware and edge functions.

`instrumentation.ts` boots the right config per runtime and re-exports `captureRequestError` so Next 15+ server-side render failures get captured.

`app/global-error.tsx` calls `Sentry.captureException` so React render-time crashes that reach the root error boundary aren't lost.

Production traffic to Sentry is tunneled via `/monitoring/*` (configured in `withSentryConfig({ tunnelRoute })`) so ad blockers can't drop reports.

To enable, set `NEXT_PUBLIC_SENTRY_DSN` (and optionally the build-time `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` triplet on Vercel for source-map upload). With no DSN set, the SDK is a no-op — builds and runtime are unaffected.

## 🏗 Tech & Architecture

-   **Next.js 16+ (App Router)**: Organized into 23+ dynamic routes spanning auth, storefronts, dashboards, and legal pages. Optimized performance and SEO via Server Components.
-   **Framer Motion**: Smooth, premium animations throughout the UX.
-   **Zustand**: Lightweight global state for cart and user sessions.
-   **Tailwind CSS v4**: Utility-first styling with a custom design system.
-   **Forms & Validation**: Built with `react-hook-form` and `zod` for robust client-side validation.
-   **Utilities**: `sonner` for toast notifications, `browser-image-compression` for client-side uploads, and `qrcode.react` for store sharing.

### Component Structure
The `components/` directory is logically grouped into 17 domains, including `auth`, `dashboard`, `products-browser`, `stores-browser`, `reviews`, `seo`, and reusable primitives in `ui`.

### Hooks & Lib
Custom React hooks (`useAuth`, `useProductsBrowser`, etc.) and API client wrappers are organized in the `hooks/` and `lib/` directories, abstracting complex data fetching and state logic.
