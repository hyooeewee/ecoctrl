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
#     -v ecoctrl-uploads:/app/uploads \
#     ecoctrl-server

ARG BUILDER_IMAGE=ghcr.io/hyooeewee/ecoctrl/builder:cache

# ────────────────────────────
# Stage 1: Builder (from shared base)
# ────────────────────────────
FROM ${BUILDER_IMAGE} AS builder

WORKDIR /app

# Copy source code
COPY packages/server/ packages/server/
COPY packages/shared/ packages/shared/

# Build workspace dependencies then the server
RUN pnpm --filter @ecoctrl/server build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

# Use domestic npm mirror for stable downloads inside China
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# Enable pnpm via corepack, reading version dynamically from package.json
RUN corepack enable

# Copy workspace manifests to resolve workspace:* deps at runtime
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN PNPM_VERSION=$(node -p "require('./package.json').packageManager.replace('pnpm@','')") && \
    corepack prepare pnpm@${PNPM_VERSION} --activate
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/

# Install production dependencies only with shared pnpm cache
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy built assets from builder and keep the original directory structure
# This ensures node_modules resolution works correctly for ESM imports
COPY --from=builder /app/packages/server/dist /app/packages/server/dist

# Copy shared package source (required for workspace:* resolution at runtime)
COPY packages/shared packages/shared

# Copy schema, drizzle config, and migration files for runtime
COPY packages/server/drizzle.config.ts packages/server/
COPY packages/server/src/schemas packages/server/src/schemas

# Replace workspace symlink with actual files — esm-loader's resolveTsPaths
# cannot follow symlinks, so we copy the real source into node_modules.
RUN rm -rf /app/packages/server/node_modules/@ecoctrl/shared && \
    cp -a /app/packages/shared /app/packages/server/node_modules/@ecoctrl/shared

# Install drizzle-kit globally for migration capability
RUN npm install -g drizzle-kit@0.31.10

# Install curl for healthcheck
RUN apk add --no-cache curl

# Ensure uploads directory exists and is writable
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Do NOT copy .env.local — pass env vars at runtime via --env-file or -e flags

EXPOSE 3000

# Run from packages/server to match the node_modules resolution path
WORKDIR /app/packages/server

# Entrypoint: generate migrations if schema changed, then apply and start server
COPY <<'ENTRYPOINT' /entrypoint.sh
#!/bin/sh
set -e

echo "Generating drizzle migrations..."
npx drizzle-kit generate

echo "Running migrations..."
npx drizzle-kit migrate || echo "No migrations to apply or migration failed, continuing to start server..."

echo "Starting server..."
exec node dist/index.mjs
ENTRYPOINT
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
