# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f apps/admin/Dockerfile -t ecoctrl-admin .
#
# Run (pass .env.local for Caddy to read API_BASE_URL / API_PREFIX / STATIC_PREFIX):
#   docker run -d -p 4173:80 --env-file apps/admin/.env.local --name ecoctrl-admin ecoctrl-admin

ARG BUILDER_IMAGE=ghcr.io/hyooeewee/ecoctrl/builder:cache

# ────────────────────────────
# Stage 1: Builder (from shared base)
# ────────────────────────────
FROM ${BUILDER_IMAGE} AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build workspace dependencies then the admin app
RUN pnpm --filter @ecoctrl/admin build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM caddy:2-alpine AS production

# Copy Caddyfile
COPY --from=builder /app/apps/admin/Caddyfile /etc/caddy/Caddyfile

# Copy built static assets
COPY --from=builder /app/apps/admin/dist /usr/share/caddy

EXPOSE 80
