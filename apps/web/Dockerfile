# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f apps/web/Dockerfile -t ecoctrl-web .
#
# Run (pass .env.local for Caddy to read API_BASE_URL / API_PREFIX / STATIC_PREFIX):
#   docker run -d -p 8081:80 --env-file apps/web/.env.local --name ecoctrl-web ecoctrl-web

ARG BUILDER_IMAGE=ghcr.io/hyooeewee/ecoctrl/builder:cache

# ────────────────────────────
# Stage 1: Builder (from shared base)
# ────────────────────────────
FROM ${BUILDER_IMAGE} AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build workspace dependencies then the web app
RUN pnpm --filter @ecoctrl/web build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM caddy:2-alpine AS production

# Copy Caddyfile
COPY --from=builder /app/apps/web/Caddyfile /etc/caddy/Caddyfile

# Copy built static assets
COPY --from=builder /app/apps/web/build/client /usr/share/caddy

EXPOSE 80
