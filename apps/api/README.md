# Vendly API

The core backend service for the Vendly platform, built with NestJS and Prisma.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Cloudinary Account
- Resend API Key

### Installation
1.  Navigate to the directory:
    ```bash
    cd apps/api
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    (Update the variables with your own credentials)

4.  Initialize the database:
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```

## 🛠 Available Scripts

-   `npm run start:dev`: Starts the development server with watch mode.
-   `npm run build`: Builds the application for production.
-   `npm run test`: Runs unit tests.
-   `npm run lint`: Checks for linting errors.

## 🏗 Core Modules

-   **Auth**: JWT-based authentication and role management.
-   **Store**: Entrepreneur store profile management and statistics.
-   **Product**: Product listing management with support for dynamic categories and media.
-   **Order**: Handling checkout and fulfillment status.
-   **Common**: Shared utilities, decorators, and global filters.

## 🗃 Database Schema

We use Prisma for type-safe database access. The schema is located at `prisma/schema.prisma`. To update the schema:
1.  Make changes to the `schema.prisma` file.
2.  Run `npx prisma migrate dev --name <migration_name>`.

## 🌐 API Interaction

The API runs on port 1000 by default. It supports CORS for official Web and Admin frontends.
