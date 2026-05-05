# SupplyIQ Application

> Multi-warehouse Inventory Management System — Backend + Desktop App

## About

SupplyIQ is a full-stack industrial inventory management platform built for South African businesses. This monorepo contains:

- **Backend** — TanStack Start application with PostgreSQL database
- **Desktop** — Tauri desktop app (Windows, macOS, Linux)
- **Packages** — Shared utilities and types

## Architecture

```
application/
├── backend/          # TanStack Start full-stack app
│   ├── src/          # React frontend + server code
│   │   ├── routes/   # 16 app routes (dashboard, catalog, etc.)
│   │   ├── components/  # 100+ React components
│   │   ├── hooks/    # 12 data/mutation hooks
│   │   ├── server/   # Database + API + Auth
│   │   │   ├── db/   # Drizzle ORM schemas (11 tables)
│   │   │   ├── api/  # 9 API handler files
│   │   │   └── auth/ # Auth system
│   │   ├── contexts/ # Auth, Demo, Role providers
│   │   └── lib/      # Business logic engines
│   ├── drizzle.config.ts
│   └── wrangler.jsonc
├── desktop/          # Tauri desktop wrapper
│   └── src-tauri/    # Rust backend
└── packages/         # Shared code
    └── shared/       # cn() utility
```

## Features

- Real-time inventory tracking
- Multi-warehouse management
- Supplier management with performance scoring
- Purchase order workflow (create → receive → track)
- Stock movements (received, shipped, adjusted, transferred)
- Inventory requests with approval workflow
- AI-powered reorder suggestions
- Anomaly detection engine
- Barcode scanning support
- CSV import/export
- Command palette (CMD+K)
- Keyboard shortcuts
- Role-based access (Admin, Manager, Requestor)
- Guided onboarding tour
- Notification system
- Analytics dashboard with charts (Recharts)

## Tech Stack

- **React 19** + **TanStack Start**
- **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui** (Radix UI)
- **PostgreSQL** + **Drizzle ORM**
- **Vite 7**
- **Tauri 2** (desktop)
- **Framer Motion** (animations)
- **Recharts** (charts)

## Getting Started

### Prerequisites

- **Bun** >= 1.3
- **PostgreSQL** running locally
- **Rust** (for Tauri desktop build, optional)

### Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and SMTP credentials

# Run database migrations
bun run db:generate

# Start dev server
bun run dev:app        # http://localhost:8080

# Build for production
bun run build:app
```

### Desktop App

```bash
# Install Rust first: https://rustup.rs
bun run dev:desktop     # Tauri dev mode
bun run build:desktop   # Build installers
```

## Database Schema

11 PostgreSQL tables managed by Drizzle ORM:

| Table | Purpose |
|---|---|
| `workspaces` | Multi-tenant workspaces |
| `users` | User accounts with roles |
| `categories` | Item categories |
| `items` | Inventory items |
| `suppliers` | Supplier directory |
| `locations` | Warehouse locations (hierarchical) |
| `movements` | Stock movements |
| `purchase_orders` | Purchase orders |
| `requests` | Inventory requests |
| `notifications` | In-app notifications |
| `subscriptions` | Subscription tiers & activation keys |

## Auth & Subscription

- Email + password authentication (SHA-256 + salt)
- Session-based auth (httpOnly cookies)
- Role-based access control (Admin/Manager/Requestor)
- Subscription tiers: Demo → 1yr / 3yr / 5yr / 7yr
- Activation key system (SW-XXXX-XXXX-XXXX-XXXX-XXXX)
- 14-day free trial for new workspaces

## Pricing (ZAR)

| Plan | Price/month |
|---|---|
| Free Trial | R0 (14 days) |
| 1 Year | R499 |
| 3 Year | R399 |
| 5 Year | R299 |
| 7 Year | R199 |

## Related Repos

- **SupplyIQ Landing**: Public marketing website at `/landing`
# Supply-IQ
