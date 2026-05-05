-- SupplyIQ Database Initialization
-- Creates the database schema on first run

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  industry VARCHAR(100),
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Note: Full schema is managed by Drizzle ORM migrations
-- Run 'bun run db:migrate' after the app starts for the complete schema
