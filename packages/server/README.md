# Server Backend API

EcoCtrl backend API built with Fastify 5 + TypeScript + Drizzle ORM.

## Prerequisites

- Node.js 22+, pnpm 10+, PostgreSQL
- `.env.local` (copy from `.env.example`)

All commands below run from the monorepo root unless noted.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Listen port | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret | `change-in-production` |
| `BASE_URL` | External API base URL | `http://example.com` |
| `APP_ID` | External API app ID | `appid001` |

## Quick Start

```bash
pnpm install
pnpm --filter @ecoctrl/server db:push
pnpm --filter @ecoctrl/server db:seed
pnpm --filter @ecoctrl/server dev
```

## Deployment

| Mode | Command | Notes |
|---|---|---|
| **Docker** | `docker build -f packages/server/Dockerfile -t ecoctrl-server .` | Or `cd docker && docker compose up --build` |
| **PM2** | `pnpm --filter @ecoctrl/server start` | Production build + `pm2 start ecoctrl.config.cjs` |
| **Preview** | `pnpm --filter @ecoctrl/server preview` | Staging: build + `node` directly |
| **start.sh** | `./scripts/start.sh` | Root script: admin + web + server |
| **Dev** | `pnpm --filter @ecoctrl/server dev` | tsx watch |

## Database

```bash
pnpm --filter @ecoctrl/server db:generate   # Generate migrations
pnpm --filter @ecoctrl/server db:migrate    # Run migrations
pnpm --filter @ecoctrl/server db:push       # Push schema to DB
pnpm --filter @ecoctrl/server db:studio     # Drizzle Studio
pnpm --filter @ecoctrl/server db:seed       # Seed data
pnpm --filter @ecoctrl/server db:reset      # Reset data
pnpm --filter @ecoctrl/server db:refresh    # Drop + push + seed + studio
pnpm --filter @ecoctrl/server db:drop       # Drop last migration
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (tsx watch) |
| `pnpm build` | Production build (Rolldown) |
| `pnpm build:watch` | Build in watch mode |
| `pnpm preview` | Staging build + run |
| `pnpm start` | Build + PM2 start |
| `pnpm stop` | PM2 stop |
| `pnpm restart` | PM2 restart |
| `pnpm check` | Type check (`tsc --noEmit`) |
| `pnpm clean` | Remove `dist/` |
