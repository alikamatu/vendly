<![CDATA[# 🌐 Vendly Web — Campus Storefront

> Next.js 16 storefront for browsing, buying, and managing products on Vendly.

---

## Quick Start

```bash
npm install
npm run dev                # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:1000` in `.env`.

---

## Architecture

```
app/                         # Next.js App Router
├── page.tsx                 # Homepage (hero + filters + product grid)
├── layout.tsx               # Root layout (providers, fonts, metadata)
├── (auth)/                  # Auth pages (grouped route)
│   ├── register/            # User registration
│   ├── verify-email/        # Email verification
│   ├── forgot-password/     # Password reset request
│   ├── reset-password/      # Password reset form
│   └── seller-verification/ # Seller doc submission
├── products/                # Product listing with filters
├── product/                 # Product detail page
├── cart/                    # Shopping cart & checkout
├── favorites/               # Wishlist page
├── orders/                  # Order history (buyer)
├── dashboard/               # Seller dashboard
│   ├── page.tsx             # Overview (stats, recent orders)
│   ├── products/            # CRUD products (seller)
│   ├── orders/              # Manage orders (seller)
│   └── settings/            # Store settings
├── create-store/            # Store onboarding flow
├── s/                       # Public store pages (/s/:store-link)
├── error.tsx                # Error boundary
├── not-found.tsx            # 404 page
└── loading.tsx              # Global loading skeleton

components/
├── layout/
│   ├── Header.tsx           # Navigation bar with search & links
│   ├── GlobalSearch.tsx     # Full-screen animated search modal
│   └── Footer.tsx           # Site footer
├── common/
│   ├── ModernHero.tsx       # Animated hero section
│   ├── Container.tsx        # Max-width wrapper
│   ├── Portal.tsx           # React portal for modals
│   ├── PageTransition.tsx   # Route transition wrapper
│   └── FormFieldAnimation.tsx
├── products/
│   ├── ProductCard.tsx      # Product card with cart & favorite actions
│   ├── ProductFilters.tsx   # Category pills, price range, sort, mobile drawer
│   └── SellerProductCard.tsx # Seller dashboard product card
├── auth/                    # Auth-related components
├── dashboard/               # Dashboard-specific components
└── ui/                      # Base UI elements

lib/
├── auth-context.tsx         # AuthProvider (JWT, login, register, logout)
├── cart-context.tsx          # CartProvider (add, remove, quantities)
├── favorite-context.tsx     # FavoriteProvider (toggle, optimistic UI)
├── theme.tsx                # ThemeProvider (dark/light mode)
├── cloudinary.ts            # Cloudinary URL helpers
├── api/                     # API service layer
│   ├── index.ts             # Shared fetch utility with auth headers
│   ├── auth.ts              # Auth API calls
│   ├── product.ts           # Product API calls
│   ├── store.ts             # Store API calls
│   ├── order.ts             # Order API calls
│   └── favorite.ts          # Favorite API calls
└── validations/             # Zod schemas
```

---

## Key Features

### 🔍 Global Search
A full-screen, animated search modal (`GlobalSearch.tsx`) with Portal-based rendering, debounced input, and real-time results.

### 🏷️ Product Filters
`ProductFilters.tsx` provides:
- Horizontal category pills with scroll
- Price range inputs (min/max)
- Sort options (newest, price low→high, price high→low)
- Mobile bottom-sheet drawer with drag-to-close gestures
- Hidden scrollbar utilities for clean aesthetics

### ❤️ Favorites
- `FavoriteContext` manages global favorite state
- Optimistic UI updates on toggle
- Heart icon on `ProductCard` fills/unfills instantly
- Dedicated `/favorites` page with grid layout

### 🛒 Cart
- `CartContext` manages cart items in-memory
- Add/remove/update quantity
- Checkout flow with delivery method selection (pickup/delivery)

### 🌗 Dark Mode
Full theme support via `ThemeProvider` with CSS custom properties.

---

## Context Providers

The app wraps all pages with these providers (in order):

```
ThemeProvider → AuthProvider → FavoriteProvider → CartProvider → StoreGuard
```

| Provider | Purpose |
|---|---|
| `ThemeProvider` | Dark/light theme toggle |
| `AuthProvider` | JWT token management, user state, login/logout |
| `FavoriteProvider` | Global favorite IDs, toggle with optimistic UI |
| `CartProvider` | Shopping cart state management |
| `StoreGuard` | Redirect sellers without stores to onboarding |

---

## API Integration

All API calls go through `lib/api/index.ts`, which:
- Reads the JWT from `localStorage` (`vendly_token`)
- Attaches `Authorization: Bearer <token>` headers
- Handles response errors consistently
- Provides typed `get`, `post`, `patch`, `del` methods

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Styling

- **Tailwind CSS 4** with PostCSS
- **Framer Motion** for page transitions, modal animations, and micro-interactions
- **Geist** font family (Sans + Mono) from Google Fonts
- Custom utilities in `globals.css`: `scrollbar-hide`, `no-scrollbar`
]]>
