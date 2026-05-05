FROM oven/bun:1-alpine

WORKDIR /app

# Copy workspace config and all packages
COPY package.json bun.lock ./
COPY packages/ packages/
COPY backend/ backend/

# Install dependencies
RUN cd backend && bun install

# Expose port
EXPOSE 8080

# Start dev server
WORKDIR /app/backend
CMD ["sh", "-c", "NODE_OPTIONS='--no-deprecation' bun run vite dev --port ${PORT:-8080} --host 0.0.0.0"]
