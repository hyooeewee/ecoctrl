# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f apps/admin/Dockerfile -t ecoctrl-admin .
#
# Run (pass .env.local for Caddy to read API_BASE_URL / API_PREFIX / STATIC_PREFIX):
#   docker run -d -p 4173:80 --env-file apps/admin/.env.local --name ecoctrl-admin ecoctrl-admin

# ────────────────────────────
# Stage 1: Builder
# ────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests for optimal layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

# Install dependencies (resolves workspace:* protocol)
RUN pnpm install --frozen-lockfile

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

# Caddy reads API_BASE_URL / API_PREFIX / STATIC_PREFIX from the container env
# at runtime (override via --env-file or compose env_file). See apps/admin/.env.local.

CMD ["caddy", "run"]
