# Vendly — The Marketplace for Verified Entrepreneurs

Vendly is a comprehensive marketplace platform designed specifically for verified entrepreneurs to manage their sales, showcase products, and scale their businesses professionally. By shifting away from informal DM-based commerce, Vendly provides a premium, trust-driven ecosystem for both sellers and buyers.

![Node](https://img.shields.io/badge/Node.js-v20+-green)
![pnpm](https://img.shields.io/badge/pnpm-v9+-orange)
![NestJS](https://img.shields.io/badge/NestJS-v11-ea2845)
![Next.js](https://img.shields.io/badge/Next.js-v16-black)
![Prisma](https://img.shields.io/badge/Prisma-v7-2d3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-336791)

## 🚀 Project Overview

The project is structured as a monorepo (powered by Turborepo and pnpm workspaces) containing two core applications and several shared packages:

### Applications
-   **API** (`apps/api`): A robust NestJS backend powering the entire platform. Admin functionality is built directly into this API.
-   **Web Storefront** (`apps/web`): A modern Next.js application for buyers and entrepreneur profiles.

### Shared Packages
| Package | Description |
|---------|-------------|
| `@vendly/types` | Shared TypeScript interfaces and types across Web and API. |
| `@vendly/eslint-config` | Shared ESLint configurations (base, next, nest). |
| `@vendly/typescript-config` | Shared TypeScript configurations. |

## ✨ Core Features

-   **Authentication & Security**: Role-based access control (Admin, Seller, User), Google OAuth, and robust 2FA (TOTP + SMS).
-   **Store Management**: Entrepreneurs can create and customize their own store presence, including subscription/Pro features.
-   **Product Discovery**: Advanced search with category filtering, video previews, and SKU-based variants. Bulk CSV import is supported.
-   **Order Lifecycle**: Real-time order tracking, status updates, and a complete return request workflow.
-   **Payment Integration**: Full Paystack integration with split payments, subaccounts, and a double-entry financial ledger for payouts.
-   **Review & Notification**: Verified purchase reviews with a flagging system, plus 16 distinct in-app notification types.
-   **Verification System**: A dedicated approval workflow for new sellers to maintain platform trust.
-   **SEO**: Dynamic sitemaps, robots.txt generation, OG images, and JSON-LD for rich snippets.

## 🛠 Tech Stack

### Backend (API)
-   **Framework**: [NestJS](https://nestjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Media Storage**: [Cloudinary](https://cloudinary.com/) (Images & Videos)
-   **Email**: [Resend](https://resend.com/)
-   **Caching**: Redis
-   **Payments**: [Paystack](https://paystack.com/)

### Frontend (Web)
-   **Framework**: [Next.js 16+](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **UI Components**: [Lucide React](https://lucide.dev/)

## 🚦 Getting Started

### Prerequisites
-   Node.js (v20+)
-   pnpm (v9+)
-   PostgreSQL instance
-   Redis instance (optional, falls back to in-memory)
-   Paystack Account

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/alikamatu/vendly.git
    cd vendly
    ```

2.  **Install dependencies**:
    From the root of the monorepo, install all dependencies:
    ```bash
    pnpm install
    ```

3.  **Environment Setup**:
    Copy the `.env.example` to `.env` in both `apps/api` and `apps/web` (or `.env.local` for web), and fill in your credentials.
    ```bash
    cp apps/api/.env.example apps/api/.env
    cp apps/web/.env.example apps/web/.env.local
    ```

4.  **Database Migration & Seeding** (Run from root):
    ```bash
    pnpm --filter @vendly/api exec prisma generate
    pnpm --filter @vendly/api exec prisma migrate dev
    pnpm --filter @vendly/api run db:seed
    ```

5.  **Running Locally**:
    Start the development servers for all apps using Turborepo:
    ```bash
    pnpm dev
    ```
    -   API: runs on port 1000
    -   Web: runs on port 3000

## 📖 Documentation

Detailed documentation for each component can be found in their respective directories:
-   [API Reference](API_REFERENCE.md)
-   [API Documentation](apps/api/README.md)
-   [Web Storefront Documentation](apps/web/README.md)
-   [Architecture Deep Dive](ARCHITECTURE.md)
-   [Contribution Guidelines](CONTRIBUTING.md)
-   [AWS Setup Guide](AWS_SETUP.md)

## 🛡 License

This project is licensed under the UNLICENSED license. See the project leads for details.
