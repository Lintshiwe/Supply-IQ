FROM oven/bun:1-alpine

WORKDIR /app

# Copy all source
COPY . .

# Install only the backend deps
RUN cd backend && bun install

WORKDIR /app/backend

EXPOSE 10000

CMD ["sh", "-c", "NODE_OPTIONS='--no-deprecation' bun run vite dev --port ${PORT:-10000} --host 0.0.0.0"]
