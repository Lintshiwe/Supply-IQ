FROM oven/bun:1-alpine

WORKDIR /app

# Copy only backend — no desktop/packages needed
COPY backend/ backend/

WORKDIR /app/backend

# Install only production dependencies
RUN bun install --production && bun add vite @vitejs/plugin-react

EXPOSE 10000

ENV NODE_OPTIONS="--max-old-space-size=384"

CMD ["sh", "-c", "bun run vite dev --port ${PORT:-10000} --host 0.0.0.0"]
