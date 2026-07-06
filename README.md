# EcoCtrl

[![Release](https://github.com/hyooeewee/ecoctrl/actions/workflows/stable.yaml/badge.svg)](https://github.com/hyooeewee/ecoctrl/actions/workflows/stable.yaml)
[![Version](https://img.shields.io/github/v/tag/hyooeewee/ecoctrl?label=version)](https://github.com/hyooeewee/ecoctrl/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?logo=nodedotjs)](https://nodejs.org/)

![Admin](docs/screenshots/admin.png)

An energy & IoT control platform built as a pnpm monorepo, featuring 3D visualization, real-time monitoring, and a unified management dashboard.

**📖 Documentation**: [docs.godot.qzz.io](https://docs.godot.qzz.io)

## Architecture

| Package           | Stack                                                   | Description                                                |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `apps/admin`      | React 19 + vite-plus + TailwindCSS + shadcn/ui          | Admin dashboard                                            |
| `apps/web`        | React Router 7 + Babylon.js + vite-plus + TailwindCSS   | Public 3D portal                                           |
| `packages/server` | Fastify 5 + Drizzle ORM + PostgreSQL + Rolldown + MinIO | REST API (bundled with auto-generated `dist/package.json`) |
| `packages/ui`     | React + TailwindCSS + shadcn/ui                         | Shared component library                                   |
| `packages/shared` | Zod + TypeScript + shared Vite configs                  | Shared schemas, types, and build utilities                 |

## Quick Start

### Docker (Recommended)

```bash
cd docker
cp .env.example .env.local
# Edit .env.local: fill in JWT_SECRET, DATABASE_URL

# From source (builds images locally)
docker compose -f compose.build.yaml up --build

# Or pull pre-built images
docker compose up
```

| Service  | URL                                 |
| -------- | ----------------------------------- |
| Web      | http://localhost:8081               |
| Admin    | http://localhost:4173               |
| API      | http://localhost:3000               |
| API Docs | http://localhost:3000/documentation |
| MinIO    | http://localhost:9001 (console)     |

> **Offline/air-gapped?** Download the [offline bundle](https://bucket.godot.qzz.io/images/latest/ecoctrl.zip) — includes pre-pulled images, no registry access needed.

## Local Development

### Prerequisites

- Node.js 24+
- pnpm 11+
- PostgreSQL 16+ (or Docker)
- MinIO (included in Docker setup, or use AWS S3)

### Setup

```bash
# 1. Install
pnpm install

# 2. Start PostgreSQL and MinIO
cd docker
docker compose up postgres minio -d

# 3. Configure environment
cp packages/server/.env.example packages/server/.env.local
# Edit .env.local: fill in DATABASE_URL, JWT_SECRET, and S3 credentials

# 4. Initialize database
cd packages/server
pnpm db:push
pnpm db:seed

# 5. Start all services
pnpm dev
```

| Command           | Service                        |
| ----------------- | ------------------------------ |
| `pnpm dev`        | All services                   |
| `pnpm dev:server` | API on http://localhost:3001   |
| `pnpm dev:admin`  | Admin on http://localhost:5173 |
| `pnpm dev:web`    | Web on http://localhost:8080   |

Other useful commands (run from `packages/server/`):

```bash
pnpm db:reset    # drop all tables, re-run init + seed (destructive)
pnpm db:migrate  # apply pending migrations
pnpm db:studio   # open Drizzle Studio
```

## Documentation

- [Deployment Guide](https://docs.godot.qzz.io/deployment/docker) — Docker deployment, local development
- [Architecture](https://docs.godot.qzz.io/reference/architecture/overview) — request flow, runtime topology
- [Environment Variables](https://docs.godot.qzz.io/deployment/env-vars) — full reference
- [API Docs](http://localhost:3001/documentation) — Swagger UI (server must be running)

## License

MIT
