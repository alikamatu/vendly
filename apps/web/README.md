# Vendly Web Storefront

The primary marketplace frontend for Vendly, where buyers explore products and entrepreneurs showcase their stores.

## 🚀 getting Started

### Installation
1.  Navigate to the directory:
    ```bash
    cd apps/web
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    Ensure `NEXT_PUBLIC_API_URL` points to your running API.

## 🛠 Available Scripts

-   `npm run dev`: Starts the Next.js development server.
-   `npm run build`: Compiles the application for production.
-   `npm run lint`: Runs ESLint to check for code quality.

## ✨ Key Features

-   **Modern Hero Section**: A premium, minimal landing area to attract visitors.
-   **Verified Profiles**: Dedicated store pages for entrepreneurs (`/s/[slug]`).
-   **Dynamic Product Previews**: Auto-playing video support in search and order history.
-   **Responsive Navigation**: Optimized for mobile and desktop with a role-based profile menu.
-   **Order Tracking**: Simple and engaging order history tracking for buyers.

## 🏗 Tech & Architecture

-   **Next.js App Router**: Optimized performance and SEO.
-   **Framer Motion**: Smooth, premium animations throughout the UX.
-   **Zustand**: Lightweight global state for cart and user sessions.
-   **Tailwind CSS**: Utility-first styling with a custom design system.
