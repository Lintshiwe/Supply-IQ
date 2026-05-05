FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/ packages/
COPY backend/ backend/
RUN bun install
WORKDIR /app/backend
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/server.js ./backend/
EXPOSE 8082
CMD ["bun", "run", "backend/server.js"]
