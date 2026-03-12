<![CDATA[# 🛡️ Vendly Admin — Back-Office Panel

> Next.js 16 admin dashboard for managing the Vendly marketplace.

---

## Quick Start

```bash
npm install
npm run dev                # http://localhost:3001
```

---

## Architecture

```
app/
├── page.tsx               # Redirect to dashboard
├── layout.tsx             # Root layout (ThemeProvider)
├── (auth)/                # Admin login
│   └── login/
└── (back-office)/         # Protected admin area
    └── dashboard/         # Main dashboard
        ├── page.tsx       # Overview & stats
        ├── approvals/     # Seller verification management
        └── users/         # User management

services/
├── auth.service.ts        # Admin authentication API calls
└── admin.service.ts       # Approvals & stats API calls

components/                # Admin UI components
constants/                 # App-wide constants
hooks/                     # Custom React hooks
lib/
└── theme.tsx              # ThemeProvider (dark/light mode)
types/                     # TypeScript type definitions
utils/                     # Utility functions
```

---

## Features

### 🔐 Admin Authentication
- Dedicated admin login flow
- JWT-based authentication against the API
- Role validation (ADMIN role required)

### ✅ Seller Verification
- View pending verification requests
- Approve or reject seller applications
- Track review history

### 📊 Platform Statistics
- Total users, sellers, and products
- Order volume and revenue metrics
- Dashboard overview cards

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** | App Router framework |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations |
| **Lucide React** | Icons |
| **shadcn-ui** | UI component primitives |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## API Integration

The admin panel communicates with the same NestJS API as the storefront, using endpoints under `/admin/*` that require the `ADMIN` role:

| Endpoint | Description |
|---|---|
| `GET /admin/approvals` | List verification requests |
| `GET /admin/stats` | Platform statistics |
| `PATCH /admin/approve/:id` | Approve/reject a seller |
]]>
