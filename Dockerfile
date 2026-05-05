FROM oven/bun:1-alpine AS builder

WORKDIR /app
COPY backend/ backend/
WORKDIR /app/backend
RUN bun install && bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/start.js ./
COPY --from=builder /app/backend/package.json ./

EXPOSE 8080
ENV PORT=8080 NODE_OPTIONS="--max-old-space-size=128"

CMD ["bun", "run", "start.js"]
