# SupplyIQ Application

> Multi-warehouse Inventory Management System — Backend + Desktop App

## Quick Start

```bash
bun install
cp .env.example .env   # Edit with your DATABASE_URL
bun run dev:app        # http://localhost:8080
```

## Architecture

```
backend/          # TanStack Start full-stack app (React 19 + PostgreSQL)
desktop/          # Tauri desktop wrapper (Win/Mac/Linux)
packages/shared/  # Shared utilities
```

## Features

- Real-time inventory tracking across multiple warehouses
- Supplier management with performance scoring
- Purchase orders, stock movements, inventory requests
- AI-powered reorder suggestions & anomaly detection
- Barcode scanning, CSV import/export
- Role-based access (Admin, Manager, Requestor)
- Device-based licensing (2/5/10/20 devices per tier)
- Activation key system with file download
- Guided onboarding tour & analytics dashboard

## Database

PostgreSQL with Drizzle ORM — 12 tables: workspaces, users, categories, items, suppliers, locations, movements, purchase_orders, requests, notifications, subscriptions, devices.

## Pricing (ZAR)

| Plan | Price/month | Devices |
|---|---|---|
| Free Trial | R0 | 1 |
| 1 Year | R499 | 2 |
| 3 Year | R399 | 5 |
| 5 Year | R299 | 10 |
| 7 Year | R199 | 20 |

## Deploy

See [DEPLOY.md](DEPLOY.md) for production deployment to Cloudflare Workers + Pages.

```bash
# Backend → Cloudflare Workers
bun run build:app
bunx wrangler deploy backend/dist/server/worker-entry.js

# Landing → Cloudflare Pages / Vercel / Netlify
cd ../landing && bun run build
```

## Related

**SupplyIQ Landing**: Marketing site at [github.com/Lintshiwe/Supply-IQ-Landing-Page](https://github.com/Lintshiwe/Supply-IQ-Landing-Page)
