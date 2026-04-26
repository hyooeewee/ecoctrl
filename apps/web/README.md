# Web Frontend

React Router 7 dashboard application with 3D building visualization via BabylonJS.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Backend API running (see `packages/server`)

## Environment Variables

| Variable            | Description                                                     | Example                 |
| ------------------- | --------------------------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL` | Backend API origin (must be accessible from the user's browser) | `http://localhost:3000` |
| `VITE_API_PREFIX`   | API route prefix                                                | `/api`                  |

> **⚠️ Important:** `VITE_API_BASE_URL` must be a **publicly accessible address** from the user's browser. If the web app is deployed at `http://example.com:8081`, setting this to `http://localhost:3000` will cause users' browsers to try connecting to their own local machine instead of the server. Use the server's public IP or domain name for production deployments.

Create a local environment file:

```bash
cp .env.example .env.local
```

## Deployment

### Option 1: Docker (Recommended)

Build image (must run from monorepo root):

```bash
docker build -f apps/web/Dockerfile -t ecoctrl-web .
```

Run container:

```bash
docker run -d \
    --name ecoctrl-web \
    -p 8081:80 \
    ecoctrl-web
```

Or use Docker Compose (one command for all services):

```bash
cd docker && docker compose up --build
```

### Option 2: Local

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build workspace dependencies and the web app
pnpm --filter @ecoctrl/ui build
pnpm --filter @ecoctrl/web build

# Serve the static build/client/ directory
# Option A: using Caddy
cd apps/web && caddy run --config Caddyfile

# Option B: using any static file server
npx serve apps/web/build/client -l 8081
```

## Development

```bash
# Start dev server with hot reload (port 8080)
pnpm --filter @ecoctrl/web dev
```

## Common Commands

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Start dev server with hot reload (port 8080) |
| `pnpm build`     | Production build                             |
| `pnpm preview`   | Preview production build (port 8081)         |
| `pnpm start`     | Build and serve (port 8081)                  |
| `pnpm check`     | Type check + lint + format                   |
| `pnpm check:fix` | Auto-fix issues                              |
