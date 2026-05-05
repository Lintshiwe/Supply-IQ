#!/usr/bin/env bash
set -e

# ─── SupplyIQ — Start All Services ────────────────────────
# Usage: ./start.sh [--with-docker] [--dev]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════╗"
echo "║        SupplyIQ — Application Launcher   ║"
echo "╚══════════════════════════════════════════╝"

# ─── Check PostgreSQL ─────────────────────────────────────
check_postgres() {
  if command -v pg_isready &>/dev/null; then
    if pg_isready -q 2>/dev/null; then
      echo "✓ PostgreSQL is running"
      return 0
    fi
  fi

  # Try connecting
  if bun run --silent -e "
    const postgres = require('postgres');
    const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/supplyiq', { connect_timeout: 3 });
    sql\`SELECT 1\`.then(() => { sql.end(); process.exit(0); }).catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "✓ PostgreSQL is running"
    return 0
  fi

  echo "✗ PostgreSQL is NOT running"
  return 1
}

# ─── Start with Docker ────────────────────────────────────
start_docker() {
  echo ""
  echo "┌─ Starting with Docker Compose ─────────────┐"
  if ! command -v docker &>/dev/null; then
    echo "✗ Docker not found. Install Docker first."
    exit 1
  fi
  docker compose up -d postgres
  echo "│ Waiting for PostgreSQL to be ready...       │"
  sleep 3
  docker compose up -d backend
  echo "│ All services started!                       │"
  echo "├─────────────────────────────────────────────┤"
  echo "│ Backend:  http://localhost:8080              │"
  echo "│ Database: postgres://postgres:postgres@localhost:5432/supplyiq │"
  echo "└─────────────────────────────────────────────┘"
}

# ─── Start with local Bun ──────────────────────────────────
start_local() {
  echo ""
  echo "┌─ Starting Locally ────────────────────────┐"

  if ! check_postgres; then
    echo "│ ⚠ PostgreSQL not detected. Starting without DB. │"
    echo "│ Install PostgreSQL or use: ./start.sh --with-docker │"
  else
    echo "│ ✓ Database ready                            │"
  fi

  # Load .env if exists
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi

  echo "│ Starting backend on :8080...                 │"
  cd backend && bun run dev &
  BACKEND_PID=$!

  echo "│ Starting landing on :5173...                 │"
  cd ../landing && bun run dev &
  LANDING_PID=$!

  echo "├─────────────────────────────────────────────┤"
  echo "│ Landing:  http://localhost:5173              │"
  echo "│ Backend:  http://localhost:8080              │"
  echo "└─────────────────────────────────────────────┘"
  echo ""
  echo "Press Ctrl+C to stop all services"

  trap "kill $BACKEND_PID $LANDING_PID 2>/dev/null; exit 0" INT TERM
  wait
}

# ─── Main ──────────────────────────────────────────────────
case "${1:-}" in
  --with-docker)
    start_docker
    ;;
  --dev|"")
    start_local
    ;;
  *)
    echo "Usage: ./start.sh [--with-docker | --dev]"
    exit 1
    ;;
esac
