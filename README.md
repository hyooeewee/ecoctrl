# EcoCtrl

[![Release](https://github.com/hyooeewee/ecoctrl/actions/workflows/release.yaml/badge.svg)](https://github.com/hyooeewee/ecoctrl/actions/workflows/release.yaml)
[![Version](https://img.shields.io/github/v/tag/hyooeewee/ecoctrl?label=version)](https://github.com/hyooeewee/ecoctrl/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=nodedotjs)](https://nodejs.org/)

![Admin](docs/screenshots/admin.png)

An energy & IoT control platform built as a pnpm monorepo, featuring 3D visualization, real-time monitoring, and a unified management dashboard.

**📖 Documentation**: [docs.godot.qzz.io](https://docs.godot.qzz.io)

## Architecture

| Package           | Stack                                                 | Description                                                |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `apps/admin`      | React 19 + vite-plus + TailwindCSS + Recharts         | Admin dashboard                                            |
| `apps/web`        | React Router 7 + Babylon.js + vite-plus + TailwindCSS | Public 3D portal                                           |
| `packages/server` | Fastify 5 + Drizzle ORM + PostgreSQL + Rolldown       | REST API (bundled with auto-generated `dist/package.json`) |
| `packages/ui`     | React + TailwindCSS + Base UI                         | Shared component library                                   |
| `packages/shared` | Zod + TypeScript + shared Vite configs                | Shared schemas, types, and build utilities                 |

## Quick Start

### Docker (Recommended)

```bash
cd docker
cp .env.example .env.local
# Edit .env.local: fill in JWT_SECRET, DATABASE_URL
docker compose -f compose.yml up --build
```

| Service  | URL                                 |
| -------- | ----------------------------------- |
| Web      | http://localhost:8081               |
| Admin    | http://localhost:4173               |
| API      | http://localhost:3000               |
| API Docs | http://localhost:3000/documentation |

> **Offline/air-gapped?** Download the [offline bundle](https://bucket.godot.qzz.io/images/latest/ecoctrl.zip) — includes pre-pulled images, no registry access needed.

### Pre-built Release

Download from [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases) or the R2 mirror (for users in mainland China):

| Source     | Full bundle                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub     | [`ecoctrl-vX.Y.Z.zip`](https://github.com/hyooeewee/ecoctrl/releases)                                                                                                                                            |
| R2 Mirror  | [`ecoctrl.zip`](https://bucket.godot.qzz.io/releases/latest/ecoctrl.zip)                                                                                                                                         |
| Components | [`admin.zip`](https://bucket.godot.qzz.io/releases/latest/admin.zip) · [`web.zip`](https://bucket.godot.qzz.io/releases/latest/web.zip) · [`server.zip`](https://bucket.godot.qzz.io/releases/latest/server.zip) |

```bash
unzip ecoctrl-v1.0.0.zip
cd ecoctrl
./start.sh
```

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10.33+
- PostgreSQL 16+ (or Docker)

### Setup

```bash
# 1. Install
pnpm install

# 2. Start PostgreSQL
cd docker
docker compose -f compose.yml up postgres -d

# 3. Configure environment
cp packages/server/.env.example packages/server/.env.local
# Edit .env.local: fill in DATABASE_URL and JWT_SECRET

# 4. Initialize database
cd packages/server
pnpm db:push
pnpm db:seed

# 5. Build UI library
cd ../..
pnpm build:ui

# 6. Start all services
pnpm dev
```

| Command           | Service                        |
| ----------------- | ------------------------------ |
| `pnpm dev`        | All services                   |
| `pnpm dev:server` | API on http://localhost:3000   |
| `pnpm dev:admin`  | Admin on http://localhost:5173 |
| `pnpm dev:web`    | Web on http://localhost:8080   |

Other useful commands:

```bash
pnpm db:refresh   # drop + push + seed + studio (destructive)
pnpm db:migrate   # apply pending migrations
pnpm db:studio    # open Drizzle Studio
```

## Documentation

- [Deployment Guide](https://ecoctrl.godot.run/reference/deployment) — Docker, release zips, offline bundles
- [Architecture](https://ecoctrl.godot.run/reference/architecture) — request flow, runtime topology
- [Environment Variables](https://ecoctrl.godot.run/reference/env-vars) — full reference
- [API Docs](http://localhost:3000/documentation) — Swagger UI (server must be running)

## License

MIT
