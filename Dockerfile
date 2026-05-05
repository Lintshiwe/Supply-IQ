FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/ packages/
COPY backend/ backend/
RUN bun install --frozen-lockfile
WORKDIR /app/backend
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
EXPOSE 8080
CMD ["bun", "run", "dist/server/worker-entry.js"]
