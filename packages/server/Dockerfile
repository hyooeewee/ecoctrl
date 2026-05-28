# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f packages/server/Dockerfile -t ecoctrl-server .
#
# Run:
#   docker run -d \
#     --name ecoctrl-server \
#     -p 3000:3000 \
#     --env-file .env.local \
#     ecoctrl-server

ARG BUILDER_IMAGE=ghcr.io/hyooeewee/ecoctrl/builder:cache

# ────────────────────────────
# Stage 1: Builder (from shared base)
# ────────────────────────────
FROM ${BUILDER_IMAGE} AS builder

WORKDIR /app

# Refresh workspace manifests so pnpm's implicit reinstall sees the current
# allowBuilds list (cache image may predate new build-script approvals like isolated-vm).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy source code
COPY packages/server/ packages/server/
COPY packages/shared/ packages/shared/

# Build workspace dependencies then the server & deploy scripts
RUN pnpm --filter @ecoctrl/server build
RUN pnpm --filter @ecoctrl/server deploy packages/server/prod --legacy

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

COPY --from=builder /app/packages/server/dist /app
COPY --from=builder /app/packages/server/prod/node_modules /app/node_modules

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1

# Entrypoint: run init (includes migrations), then start server
COPY <<'ENTRYPOINT' /entrypoint.sh
#!/bin/sh
set -e

echo "Running production init..."
node init.mjs

echo "Starting server..."
exec node index.mjs
ENTRYPOINT
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
