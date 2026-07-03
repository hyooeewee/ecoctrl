# Server Backend API

EcoCtrl backend API built with Fastify 5 + TypeScript + Drizzle ORM.

## Prerequisites

- Node.js 24+, pnpm 11+, PostgreSQL, MinIO (or S3-compatible storage)
- `.env.local` (copy from `.env.example`)

All commands below run from the monorepo root unless noted.

## Environment Variables

All configured in `.env.local`. Key variables:

| Variable           | Description                  | Example                               |
| ------------------ | ---------------------------- | ------------------------------------- |
| `PORT`             | Listen port                  | `3000`                                |
| `HOST`             | Bind address                 | `0.0.0.0`                             |
| `DATABASE_URL`     | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET`       | JWT signing secret           | `change-in-production`                |
| `STORAGE_PROVIDER` | Object storage backend       | `minio` / `local`                     |
| `S3_ENDPOINT`      | S3-compatible endpoint       | `http://minio:9000`                   |
| `S3_ACCESS_KEY`    | S3 access key                | `ecoctrl`                             |
| `S3_SECRET_KEY`    | S3 secret key                | —                                     |
| `S3_BUCKET_FILES`  | Bucket for uploaded files    | `ecoctrl-files`                       |
| `S3_BUCKET_MODELS` | Bucket for 3D models         | `ecoctrl-models`                      |
| `BASE_URL`         | External API base URL        | `http://example.com`                  |
| `APP_ID`           | External API app ID          | `appid001`                            |

## Quick Start

```bash
pnpm install
pnpm --filter @ecoctrl/server db:push
pnpm --filter @ecoctrl/server db:seed
pnpm --filter @ecoctrl/server dev
```

## Deployment

| Mode        | Command                                                          | Notes                                                                                                                             |
| ----------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Docker**  | `docker build -f packages/server/Dockerfile -t ecoctrl-server .` | Or `cd docker && docker compose up --build`                                                                                       |
| **Start**   | `pnpm --filter @ecoctrl/server start`                            | `NODE_ENV=production pnpm build && cp .env.local dist/ && cd dist && pnpm install --prod && node index.mjs`                       |
| **Preview** | `pnpm --filter @ecoctrl/server preview`                          | `NODE_ENV=staging pnpm build && cp .env.local dist/ && cd dist && CI=true pnpm install --prod --ignore-scripts && node index.mjs` |
| **Dev**     | `pnpm --filter @ecoctrl/server dev`                              | tsx watch                                                                                                                         |

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

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `pnpm dev`         | Dev server (tsx watch)          |
| `pnpm build`       | Production build (Rolldown)     |
| `pnpm build:watch` | Build in watch mode             |
| `pnpm preview`     | Staging build + run             |
| `pnpm start`       | NODE_ENV=production build + run |
| `pnpm check`       | Type check (`tsc --noEmit`)     |
| `pnpm clean`       | Remove `dist/`                  |
