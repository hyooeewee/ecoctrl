# EcoCtrl

[![Release](https://github.com/hyooeewee/ecoctrl/actions/workflows/release.yaml/badge.svg)](https://github.com/hyooeewee/ecoctrl/actions/workflows/release.yaml)
[![Version](https://img.shields.io/github/v/tag/hyooeewee/ecoctrl?label=version)](https://github.com/hyooeewee/ecoctrl/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=nodedotjs)](https://nodejs.org/)

An energy & IoT control platform built as a pnpm monorepo, featuring 3D visualization, real-time monitoring, and a unified management dashboard.

<!-- Screenshots -->
<!-- | Admin Dashboard | 3D Building View | -->
<!-- |:---:|:---:| -->
<!-- | ![Admin](docs/screenshots/admin.png) | ![3D](docs/screenshots/web-3d.png) | -->

## Architecture

| Package | Stack | Description |
|---------|-------|-------------|
| `apps/admin` | React 19 + Vite + TailwindCSS + Recharts | Admin dashboard |
| `apps/web` | React Router 7 + Babylon.js + TailwindCSS | Public 3D portal |
| `packages/server` | Fastify 5 + Drizzle ORM + PostgreSQL | REST API |
| `packages/ui` | React + TailwindCSS + Base UI | Shared component library |
| `packages/shared` | Zod + TypeScript | Shared schemas and types |

## Running with Docker (Recommended)

The simplest way to run the entire stack:

```bash
cd docker
cp .env.example .env.local
# Edit .env.local and fill in JWT_SECRET, BASE_URL, APP_ID
docker compose -f compose.yml up --build
```

| Service | URL |
|---------|-----|
| Web | http://localhost:8081 |
| Admin | http://localhost:4173 |
| API | http://localhost:3000 |
| API Docs | http://localhost:3000/documentation |

## Running from Release

Download the release artifacts from [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases):

```bash
# Option 1: Use the unified package
unzip ecoctrl[all]-v1.0.0.zip
cd ecoctrl

# Option 2: Download individual packages and place them together
mkdir ecoctrl
unzip admin-v1.0.0.zip -d ecoctrl/
unzip web-v1.0.0.zip -d ecoctrl/
unzip server-v1.0.0.zip -d ecoctrl/
cd ecoctrl
```

The extracted structure will be:

```
ecoctrl/
├── admin/        # Static files, serve with any web server
├── web/          # Static files, serve with any web server
└── server/       # Node.js application
```

### Server

```bash
cd server
cp .env.example .env.local
# Edit .env.local: fill in DATABASE_URL, JWT_SECRET, etc.

pnpm install --prod
node index.js
```

### Admin & Web

Both are static builds. Serve them with any static file server:

```bash
# Example with serve (npx serve)
cd admin && npx serve -s -l 4173
cd web  && npx serve -s -l 8081

# Or with nginx, Caddy, etc.
```

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10.33+
- PostgreSQL 16+ (or Docker)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
cd docker
docker compose -f compose.yml up postgres -d
```

### 3. Configure Environment

```bash
# Server
cp packages/server/.env.example packages/server/.env.local
# Edit .env.local and fill in DATABASE_URL and JWT_SECRET

# Admin
cp apps/admin/.env.example apps/admin/.env.local

# Web — .env.local already exists with sensible defaults
```

### 4. Initialize Database

```bash
cd packages/server
pnpm db:push
pnpm db:seed
cd ../..
```

### 5. Build UI Library

```bash
pnpm build:ui
```

### 6. Start Services

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm dev:server   # API on http://localhost:3000
pnpm dev:admin    # Admin on http://localhost:5173
pnpm dev:web      # Web on http://localhost:8080
```

## API Overview

Base URL: `http://localhost:3000/api`

Authentication: `Authorization: Bearer <accessToken>` (except public paths).

> Full documentation available at `http://localhost:3000/documentation` when the server is running.

## Environment Variables

### Server (`packages/server/.env.example`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `BASE_URL` / `APP_ID` | External API credentials (optional) |
| `SMTP_*` | SMTP configuration for email |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `WECHAT_*` / `FEISHU_*` | OAuth app credentials (optional) |

### Client (`apps/admin/.env.example`, `apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_API_PREFIX` | API route prefix (default: /api) |


## License

MIT
