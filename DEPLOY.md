# SupplyIQ — Deploy to Production

## Architecture

```
supplyiq.co.za           → Landing Page (static site, hosted on Cloudflare Pages / Vercel)
api.supplyiq.co.za       → Backend API (hosted on Cloudflare Workers)
                          ↓
                    PostgreSQL (Neon / Supabase / Self-hosted)
```

## 1. Database

Set up a PostgreSQL database:

**Option A: Neon (Recommended)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a project and database
3. Copy the connection string (starts with `postgres://`)
4. Set `DATABASE_URL` in your deployment environment

**Option B: Supabase**
1. Sign up at [supabase.com](https://supabase.com)
2. Create a project
3. Go to Settings → Database → Connection string
4. Use the "Session pooler" connection string

## 2. Backend (Cloudflare Workers)

```bash
cd application

# Install Wrangler if not installed
bun add -D wrangler

# Set secrets
bunx wrangler secret put DATABASE_URL
bunx wrangler secret put SMTP_USER
bunx wrangler secret put SMTP_PASS
bunx wrangler secret put SESSION_SECRET

# Deploy
bun run --cwd backend build
bunx wrangler deploy backend/dist/server/worker-entry.js
```

## 3. Landing Page

**Option A: Cloudflare Pages**
```bash
cd landing

# Build
bun run build

# Set build environment variables in Cloudflare Dashboard:
#   VITE_API_URL = https://api.supplyiq.co.za

# Upload dist/ folder to Cloudflare Pages
bunx wrangler pages deploy dist/
```

**Option B: Vercel**
```bash
cd landing

# Install Vercel CLI
bun add -D vercel

# Deploy (follow prompts)
bun run build
bunx vercel deploy dist/ --prod
```

**Option C: Netlify**
```bash
cd landing

# Build
bun run build

# Deploy via CLI or drag-and-drop dist/ folder
bunx netlify-cli deploy --prod --dir=dist/
```

## 4. Domain Configuration

1. Point `supplyiq.co.za` → Landing page hosting
2. Point `api.supplyiq.co.za` → Cloudflare Workers
3. Set up CNAME records in your DNS provider

## 5. Environment Variables Reference

| Variable | Used By | Description |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `SMTP_HOST` | Backend | SMTP server for emails |
| `SMTP_PORT` | Backend | SMTP port |
| `SMTP_USER` | Backend | SMTP username |
| `SMTP_PASS` | Backend | SMTP password / app password |
| `SESSION_SECRET` | Backend | Session encryption key |
| `VITE_API_URL` | Landing | Backend API URL |
| `VITE_SITE_URL` | Landing | Landing site URL |
