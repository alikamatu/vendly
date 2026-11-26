# Verndly — The Marketplace for Verified Entrepreneurs

Verndly is an escrow-protected marketplace platform built for verified entrepreneurs to list products, manage sales, and scale their businesses professionally. By shifting away from informal DM-based commerce, Verndly delivers a fast, AI-assisted, trust-driven shopping and selling ecosystem.

![Node](https://img.shields.io/badge/Node.js-v20+-green)
![pnpm](https://img.shields.io/badge/pnpm-v9+-orange)
![NestJS](https://img.shields.io/badge/NestJS-v11-ea2845)
![Next.js](https://img.shields.io/badge/Next.js-v16-black)
![Prisma](https://img.shields.io/badge/Prisma-v7-2d3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-336791)

## 🚀 Project Overview

The project is structured as a monorepo (powered by Turborepo and pnpm workspaces) containing four applications and shared configuration packages:

### Applications

- **API** (`apps/api`): NestJS backend powering the entire platform, including Verndly AI, multi-channel catalog importers, payments, and built-in admin APIs.
- **Web Storefront** (`apps/web`): Next.js 16+ App Router application for buyers and verified seller storefronts/dashboards.
- **Admin Dashboard** (`apps/admin`): Next.js management dashboard for platform administrators to review seller verifications, monitor transactions, and moderate users/content.
- **Mobile App** (`apps/mobile`): Expo / React Native mobile companion app.

### Shared Packages

| Package                     | Description                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `@vendly/eslint-config`     | Shared ESLint base config, used by the mobile app.                                                          |
| `@vendly/typescript-config` | Shared TypeScript configs (`base`, `nextjs`). The web and admin apps extend `nextjs`, which extends `base`. |

## ✨ Core Features

- **Verndly AI (Buyer & Seller Intelligence)**: Natural-language buyer shopping search with fast-mode caching, photo-to-listing & bulk photo grouping (up to 20 images), AI listing copy polish, storefront setup drafting, and kinetic typing AI status overlays.
- **Multi-Channel Catalog Import**:
  - **From Website**: Import single product links or full catalogs from Shopify, WooCommerce, Jumia, custom HTML stores, and client-rendered Next.js/React SPAs with automatic semantic category matching, proxied previews, and permanent Cloudinary image mirroring.
  - **From WhatsApp Business**: Import via WhatsApp catalog screenshots (with Verndly AI product photo auto-cropping), `wa.me/p/...` product links, Meta Commerce CSV exports, or Meta Graph API sync.
  - **Bulk CSV**: Standard spreadsheet product upload.
- **Modern Shopping & Checkout UX**: Full-bleed masonry product browser with an on-demand hideable filter drawer, mobile touch-swipeable product galleries, right-sidebar Buy Now drawer, seller self-purchase protection (frontend + backend), and unified alert/toast UI.
- **Authentication & Security**: Role-based access control (`ADMIN`, `SELLER`, `USER`), Google OAuth, 2FA (TOTP + SMS via Arkesel), SSRF-hardened importers, and HMAC-verified webhooks.
- **Store Management & Payments**: Custom store slugs, Pro subscriptions, Paystack split payments & subaccounts, double-entry financial ledger, and automated payouts.
- **Trust, Reviews & Verification**: Dedicated seller verification approval workflow, verified-purchase reviews with moderation flags, return requests, audit logs, and 16 in-app notification types.
- **SEO & Social Sharing**: Dynamic sitemaps, `robots.txt`, JSON-LD structured data, and retina 4:5 Pro share cards.

## 🛠 Tech Stack

### Backend (API)

- **Framework**: [NestJS](https://nestjs.com/) (v11)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/) (v7)
- **AI**: Google Gemini API powering **Verndly AI**
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (Images & Videos)
- **Email & Automations**: [Resend](https://resend.com/) & [Loops.so](https://loops.so/)
- **SMS / 2FA**: Arkesel
- **Caching**: Redis (with in-memory fallback)
- **Payments**: [Paystack](https://paystack.com/)
- **Monitoring**: [Sentry](https://sentry.io/)

### Frontend (Web & Admin)

- **Framework**: [Next.js 16+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI & Feedback**: [Lucide React](https://lucide.dev/), `sonner`, unified `<Alert />`

## 🚦 Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm (v9+)
- PostgreSQL instance
- Redis instance (optional, falls back to in-memory)
- Paystack, Cloudinary, Resend, and Gemini API credentials

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/alikamatu/vendly.git
   cd vendly
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Environment Setup**:
   Copy `.env.example` to `.env` in `apps/api` and `.env.local` in `apps/web`, then fill in your credentials.

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Database Migration & Seeding** (Run from root):

   ```bash
   pnpm --filter @vendly/api exec prisma generate
   pnpm --filter @vendly/api exec prisma migrate dev
   pnpm --filter @vendly/api run db:seed
   ```

5. **Running Locally**:
   Start all development servers using Turborepo:

   ```bash
   pnpm dev
   ```

   - API: runs on port 1000 (`nest start --watch`)
   - Web: runs on port 3000 (`next dev`)
   - Admin: runs on port 3002 (`next dev --port 3002`)
   - Mobile: Expo dev server (`expo start`)

## 📖 Documentation

- [Architecture Deep Dive](ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [API Documentation](apps/api/README.md)
- [Web Storefront Documentation](apps/web/README.md)
- [Payment Implementation](PAYMENT_IMPLEMENTATION.md)
- [Loops Integration](docs/LOOPS_INTEGRATION.md)
- [Contribution Guidelines](CONTRIBUTING.md)
- [AWS Setup Guide](AWS_SETUP.md)

## 🛡 License

This project is licensed under the UNLICENSED license. See the project leads for details.
