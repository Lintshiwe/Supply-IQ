<p align="center">
  <img src="https://raw.githubusercontent.com/Lintshiwe/Supply-IQ/main/backend/public/logo.svg" alt="SupplyIQ" width="260" />
</p>

# SupplyIQ

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
desktop/          # Tauri desktop wrapper (Win/Mac/Linux) + Electron builds
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
- Activation key system with email delivery
- Guided onboarding tour & analytics dashboard

## Pricing (ZAR)

| Plan | Price/month | Devices |
|---|---|---|
| Free Trial | R0 | 1 |
| 1 Year | R499 | 2 |
| 3 Year | R399 | 5 |
| 5 Year | R299 | 10 |
| 7 Year | R199 | 20 |

## Deploy

See [DEPLOY.md](DEPLOY.md) for production deployment.

## Download

Get the latest release at [github.com/Lintshiwe/Supply-IQ/releases](https://github.com/Lintshiwe/Supply-IQ/releases)

## Related

**SupplyIQ Landing**: [github.com/Lintshiwe/Supply-IQ-Landing-Page](https://github.com/Lintshiwe/Supply-IQ-Landing-Page)
