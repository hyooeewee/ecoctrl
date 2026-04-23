# Server Backend API

EcoCtrl backend API service built with Fastify 5 + TypeScript + Drizzle ORM.

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL database
- Environment variable file `.env.local` (see `.env.example`)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server listen port | `3000` |
| `HOST` | Server bind address | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT signing | `change-in-production` |
| `BASE_URL` | External API base URL | `http://example.com` |
| `APP_ID` | External API app ID | `appid001` |

Create a local environment file:

```bash
cp .env.example .env.local
```

## Deployment

### Option 1: Docker (Recommended)

Build image (must run from monorepo root):

```bash
docker build -f packages/server/Dockerfile -t ecoctrl-server .
```

Run container:

```bash
docker run -d \
    --name ecoctrl-server \
    -p 3000:3000 \
    --env-file .env.local \
    -v ecoctrl-uploads:/app/uploads \
    ecoctrl-server
```

Or use Docker Compose (one command for all services + database):

```bash
cd docker && docker compose up --build
```

### Option 2: PM2 (Production)

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build workspace dependencies and the server
pnpm --filter @ecoctrl/shared build
pnpm --filter @ecoctrl/server build

# Start with PM2
pnpm --filter @ecoctrl/server start
```

### Option 3: Local Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start dev server with hot reload (tsx watch)
pnpm --filter @ecoctrl/server dev
```

## Database Operations

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Run seed script |
| `pnpm db:reset` | Run reset script |
| `pnpm db:refresh` | Drop + push + seed + studio (full reset) |

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload (tsx watch) |
| `pnpm build` | Production build (Rolldown) |
| `pnpm preview` | Build and run in staging mode |
| `pnpm start` | Build and start with PM2 |
| `pnpm check` | Type check (`tsc --noEmit`) |
| `pnpm clean` | Remove dist/ directory |
