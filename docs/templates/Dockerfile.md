# Dockerfile Template

## Unified Style

### Header
```dockerfile
# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f <path>/Dockerfile -t <tag> .
#
# Run:
#   docker run -d -p <host>:<container> --name <name> <tag>
```

### Stage Separator
```dockerfile
# ────────────────────────────
# Stage N: <Name>
# ────────────────────────────
```

### Full Template (Node + Caddy SPA)
```dockerfile
# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f <path>/Dockerfile -t <tag> .
#
# Run:
#   docker run -d -p <host>:80 --name <name> <tag>

# ────────────────────────────
# Stage 1: Builder
# ────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests for optimal layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY <service>/package.json <service>/
COPY packages/<dep>/package.json packages/<dep>/

# Build-time env vars — consumed by Vite at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install dependencies (resolves workspace:* protocol)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build workspace dependencies then the service
RUN pnpm --filter @ecoctrl/<dep> build \
    && pnpm --filter @ecoctrl/<service> build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM caddy:2-alpine AS production

# Copy Caddyfile
COPY --from=builder /app/<service>/Caddyfile /etc/caddy/Caddyfile

# Copy built static assets
COPY --from=builder /app/<service>/dist /usr/share/caddy

EXPOSE 80

# Caddy's default config path is /etc/caddy/Caddyfile; no --config flag needed
CMD ["caddy", "run"]
```

### Full Template (Node Server)
```dockerfile
# syntax=docker/dockerfile:1
#
# Build context: monorepo root (required for workspace:* resolution)
#   docker build -f <path>/Dockerfile -t <tag> .
#
# Run:
#   docker run -d \
#     --name <name> \
#     -p <host>:<container> \
#     --env-file .env.local \
#     <tag>

# ────────────────────────────
# Stage 1: Builder
# ────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests for optimal layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY <service>/package.json <service>/
COPY packages/<dep>/package.json packages/<dep>/

# Install dependencies (resolves workspace:* protocol)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY <service>/ <service>/
COPY packages/<dep>/ packages/<dep>/

# Build workspace dependencies then the service
RUN pnpm --filter @ecoctrl/<dep> build \
    && pnpm --filter @ecoctrl/<service> build

# ────────────────────────────
# Stage 2: Production
# ────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

# Copy workspace manifests to resolve workspace:* deps at runtime
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY <service>/package.json <service>/
COPY packages/<dep>/package.json packages/<dep>/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built assets from builder (flatten dist to /app/dist for shorter CMD)
COPY --from=builder /app/<service>/dist ./dist
COPY --from=builder /app/packages/<dep>/dist ./packages/<dep>/dist

EXPOSE <port>

CMD ["node", "dist/index.js"]
```
