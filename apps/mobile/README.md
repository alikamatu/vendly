# Verndly Mobile App

React Native mobile application for the Verndly marketplace, built with [Expo](https://expo.dev) (SDK 58), [Expo Router](https://docs.expo.dev/router/introduction/), and [NativeWind](https://www.nativewind.dev/) (Tailwind CSS v3).

## Tech Stack

- **Framework**: Expo (SDK 58) managed workflow with Continuous Native Generation (CNG)
- **Routing**: Expo Router (file-based navigation with typed routes)
- **Styling**: NativeWind (Tailwind CSS v3 utilities matching Verndly web tokens)
- **State & Caching**: TanStack React Query + React Context (Auth, Cart, Favorites)
- **Storage**: `expo-secure-store` for auth JWTs (iOS Keychain / Android Keystore) + `@react-native-async-storage/async-storage` for carts and preferences
- **Payments**: Paystack checkout flow with in-app browser (`expo-web-browser`) and backend payment verification
- **Icons & Images**: `@expo/vector-icons` (Ionicons) and `expo-image`

---

## Features

### 🛍️ Buyer Experience

- **Shop / Home Tab**: Browse products with live search, category chips, sort options (Newest, Popular, Price, Discounts), and infinite scroll.
- **Product Details (`/product/[id]`)**: High-res image carousel, price / discount indicators, live stock counter, interactive variant selector (sizes, colors), seller profile card, and add-to-cart stepper.
- **Cart (`/cart`)**: Multi-vendor shopping cart automatically grouped by store, with quantity steppers and per-store checkout.
- **Checkout (`/checkout/[storeLink]`)**: Delivery options (Store Pickup vs Delivery with address and notes), payment timing enforcement, Paystack online payment or Cash on Delivery, and Paystack popup via in-app browser.
- **Orders (`/orders` & `/orders/[id]`)**: Buyer order history with status badges, item breakdown, WhatsApp vendor direct-messaging, payment retry for pending transactions, and cancellation.
- **Favorites / Saved (`/favorites`)**: Optimistic heart toggle with server sync.
- **Account (`/account`)**: User profile, quick links to orders and web portals, and secure logout.

### 🔐 Authentication & Security

- Email + password sign in with full **Two-Factor Authentication (2FA)** support (Authenticator TOTP codes, SMS OTPs with resend, and backup codes).
- New buyer registration with Ghana phone number validation, password strength rules, and terms agreement.
- Forgot password workflow.
- Token refresh & automatic sign-out on session expiry (401).

---

## Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_API_URL`:

- **Physical Device**: Use your computer's local network IP (e.g. `http://192.168.1.50:1000`), not `localhost`.
- **Android Emulator**: `http://10.0.2.2:1000` (maps to your machine's `localhost:1000`).
- **iOS Simulator**: `http://localhost:1000`.

### 2. Run the App

From the repository root:

```bash
# Start Metro bundler (scan QR code with Expo Go on iOS or Android)
pnpm --filter @vendly/mobile dev

# Or run directly on an emulator:
pnpm --filter @vendly/mobile android
pnpm --filter @vendly/mobile ios
pnpm --filter @vendly/mobile web
```

### 3. Quality Checks

```bash
# Run TypeScript type check
pnpm --filter @vendly/mobile type-check

# Run Expo doctor
pnpm --filter @vendly/mobile doctor
```
