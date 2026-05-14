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
FROM node:24-alpine AS builder

WORKDIR /app

# Use domestic npm mirror for stable downloads inside China
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# Enable pnpm via corepack, reading version dynamically from package.json
RUN corepack enable

# Copy workspace manifests for optimal layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN PNPM_VERSION=$(node -p "require('./package.json').packageManager.replace('pnpm@','')") && \
    corepack prepare pnpm@${PNPM_VERSION} --activate
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

# Install dependencies with shared pnpm cache to avoid concurrent download conflicts
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

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
