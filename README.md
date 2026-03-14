# Vendly — The Marketplace for Verified Entrepreneurs

Vendly is a comprehensive marketplace platform designed specifically for verified entrepreneurs to manage their sales, showcase products, and scale their businesses professionally. By shifting away from informal DM-based commerce, Vendly provides a premium, trust-driven ecosystem for both sellers and buyers.

## 🚀 Project Overview

The project is structured as a monorepo containing three core applications:

-   **API** (`apps/api`): A robust NestJS backend powering the entire platform.
-   **Web Storefront** (`apps/web`): A modern Next.js application for buyers and entrepreneur profiles.
-   **Admin Panel** (`apps/admin`): A back-office tool for platform management and seller verification.

## 🛠 Tech Stack

### Backend (API)
-   **Framework**: [NestJS](https://nestjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Media Storage**: [Cloudinary](https://cloudinary.com/) (Images & Videos)
-   **Email**: [Resend](https://resend.com/)

### Frontend (Web & Admin)
-   **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **UI Components**: [Lucide React](https://lucide.dev/), [Shadcn UI](https://ui.shadcn.com/)

## 🏗 Architecture

Vendly follows a modular architecture to ensure scalability and maintainability:

-   **Authentication**: Role-based access control (Admin, Seller, User) using JWT.
-   **Store Management**: Entrepreneurs can create and customize their own store presence.
-   **Product Discovery**: Advanced search with category filtering and video previews.
-   **Order Lifecycle**: Real-time order tracking and status updates.
-   **Verification System**: A dedicated approval workflow for new sellers to maintain platform trust.

## 🚦 Getting Started

### Prerequisites
-   Node.js (v18+)
-   npm or yarn
-   PostgreSQL instance

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/alikamatu/vendly.git
    cd vendly
    ```

2.  **Install dependencies**:
    Navigate to each app directory and install dependencies:
    ```bash
    cd apps/api && npm install
    cd ../web && npm install
    cd ../admin && npm install
    ```

3.  **Environment Setup**:
    Copy the `.env.example` (if provided) or create your own in each app directory.

4.  **Database Migration** (In `apps/api`):
    ```bash
    npx prisma migrate dev
    ```

5.  **Running Locally**:
    Start the development servers for the apps you need:
    -   API: `npm run start:dev` (port 1000)
    -   Web: `npm run dev` (port 3000)
    -   Admin: `npm run dev` (port 3001)

## 📖 Documentation

Detailed documentation for each component can be found in their respective directories:
-   [API Documentation](apps/api/README.md)
-   [Web Storefront Documentation](apps/web/README.md)
-   [Admin Panel Documentation](apps/admin/README.md)
-   [Architecture Deep Dive](ARCHITECTURE.md)
-   [Contribution Guidelines](CONTRIBUTING.md)

## 🛡 License

This project is licensed under the UNLICENSED license. See the project leads for details.
