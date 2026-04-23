# Admin Dashboard

EcoCtrl energy management platform admin dashboard. React 19 SPA built with Vite, Tailwind CSS v4, and shadcn/ui.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Environment variable file `.env.local` (see `.env.example`)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |
| `VITE_API_PREFIX` | API request prefix | `/api` |

> **⚠️ Important:** Vite inlines `VITE_*` prefixed environment variables into the build output at build time. After modifying `.env.local`, you must rebuild for changes to take effect.

Create a local environment file:

```bash
cp .env.example .env.local
```

## Deployment

### Option 1: Docker (Recommended)

Build image (must run from monorepo root):

```bash
docker build -f apps/admin/Dockerfile -t ecoctrl-admin .
```

Run container:

```bash
docker run -d \
    --name ecoctrl-admin \
    -p 4173:80 \
    ecoctrl-admin
```

Or use Docker Compose (one command for all services):

```bash
cd docker && docker compose up --build
```

### Option 2: Local

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build workspace dependencies and the admin app
pnpm --filter @ecoctrl/shared build
pnpm --filter @ecoctrl/ui build
pnpm --filter @ecoctrl/admin build

# Serve the static dist/ directory
# Option A: using Caddy
cd apps/admin && caddy run --config Caddyfile

# Option B: using built-in serve
pnpm --filter @ecoctrl/admin start
```

## Development

```bash
# Start dev server with hot reload (port 3000)
pnpm --filter @ecoctrl/admin dev
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload (port 3000) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build (port 4173) |
| `pnpm start` | Build and serve (port 4173) |
| `pnpm check` | Type check + lint + format |
| `pnpm check:fix` | Auto-fix issues |
