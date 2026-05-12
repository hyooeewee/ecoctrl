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

# ────────────────────────────
# Stage 1: Builder
# ────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests for optimal layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/

# Install dependencies (resolves workspace:* protocol)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/server/ packages/server/
COPY packages/shared/ packages/shared/

# Build workspace dependencies then the server
RUN pnpm --filter @ecoctrl/server build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests to resolve workspace:* deps at runtime
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built assets from builder (flatten dist to /app/dist for shorter CMD)
COPY --from=builder /app/packages/server/dist ./dist

# Ensure uploads directory exists and is writable
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Do NOT copy .env.local — pass env vars at runtime via --env-file or -e flags

EXPOSE 3000

CMD ["node", "dist/index.mjs"]
