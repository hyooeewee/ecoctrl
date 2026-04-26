# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f apps/web/Dockerfile -t ecoctrl-web .
#
# Run (pass .env.local for API proxy config):
#   docker run -d -p 8081:80 --env-file .env.local --name ecoctrl-web ecoctrl-web

# ────────────────────────────
# Stage 1: Builder
# ────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests for optimal layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

# Build-time env vars — consumed by Vite at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install dependencies (resolves workspace:* protocol)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build workspace dependencies then the web app
RUN pnpm --filter @ecoctrl/ui build \
    && pnpm --filter @ecoctrl/web build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM caddy:2-alpine AS production

# Copy Caddyfile
COPY --from=builder /app/apps/web/Caddyfile /etc/caddy/Caddyfile

# Copy built static assets
COPY --from=builder /app/apps/web/build/client /usr/share/caddy

EXPOSE 80

# Runtime env var for API reverse proxy (override via --env-file or -e)
ENV VITE_API_BASE_URL=http://localhost:3000

CMD ["caddy", "run"]
