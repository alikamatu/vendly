# Vendly Architecture Overview

This document provides a deep dive into the technical architecture of the Vendly platform, explaining the design decisions and data flows that power the marketplace.

## 🏛 System Design

Vendly is designed as a distributed system with a clear separation of concerns between the data layer, business logic, and presentation layers.

### 1. Data Layer (Prisma & PostgreSQL)
The schema is the source of truth for the application. Key relationships include:
-   **User ↔ SellerProfile**: A 1:1 relationship where users can elevate to seller status.
-   **SellerProfile ↔ Product**: A 1:N relationship allowing sellers to list multiple products.
-   **Order ↔ OrderItem**: A 1:N relationship for complex basket management.
-   **AdminApproval**: Tracks the verification state of users applying for seller roles.

### 2. Backend Logic (NestJS)
The API is divided into feature-based modules:
-   **Auth Module**: Handles JWT issuance, password hashing (Bcrypt), and verification emails.
-   **Product Module**: Manages listings, including dynamic category fields and Cloudinary media uploads.
-   **Store Module**: Handles store metadata, analytics aggregation, and link slug management.
-   **Order Module**: Manages the transactional flow from checkout to fulfillment.

### 3. Frontend Architecture (Next.js)
Both the Web and Admin apps leverage Next.js for:
-   **App Router**: For nested layouts and server-side optimization.
-   **Server Components**: Used for initial data fetching to reduce client-side bundle size.
-   **Client Components**: Used for interactive elements (Cart, Search, Profile Dropdowns).

## 🔄 Data Flow

### Seller Verification Flow
1.  **User** submits verification documents via the Web app.
2.  **API** creates an `AdminApproval` record and stores documents.
3.  **Admin** reviews the request in the Admin Panel.
4.  **API** updates the user's role to `SELLER` and notifies them.

### Ordering Flow
1.  **Buyer** adds products to the cart (managed via Zustand/Local Storage).
2.  **Checkout** sends order data to the API.
3.  **API** creates `Order` and `OrderItem` records, deducting stock if necessary.
4.  **Seller** receives notification and manages the order from their dashboard.

## 🛠 External Integrations

-   **Cloudinary**: Used for optimized delivery of product images and videos.
-   **Resend**: Powers all transactional emails (registrations, order confirmations).
-   **Prisma Client**: Ensures type-safe database interactions across the entire backend.

## 🚀 Performance Optimizations

-   **Image/Video Previews**: Videos are muted and auto-played for high engagement without blocking main thread interactions.
-   **Optimistic UI**: Framer Motion and React state management provide immediate feedback for actions like "Favoriting".
-   **Database Indexing**: Critical fields like `product.category` and `store_link` are indexed for sub-millisecond lookups.
