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

- Real-time inventory tracking
- Multi-warehouse management
- Supplier management with performance scoring
- Purchase orders, stock movements, inventory requests
- AI-powered reorder suggestions & anomaly detection
- Barcode scanning, CSV import/export
- Role-based access (Admin, Manager, Requestor)
- Guided onboarding tour
- Analytics dashboard with charts

## Database

PostgreSQL with Drizzle ORM — 11 tables: workspaces, users, categories, items, suppliers, locations, movements, purchase_orders, requests, notifications, subscriptions.

## Pricing (ZAR)

| Plan | Price/month |
|---|---|
| Free Trial | R0 (14 days) |
| 1 Year | R499 |
| 3 Year | R399 |
| 5 Year | R299 |
| 7 Year | R199 |

## Related

**SupplyIQ Landing**: Marketing site at [github.com/YOUR_USERNAME/SupplyIQ-landing](https://github.com/YOUR_USERNAME/SupplyIQ-landing)
