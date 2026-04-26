# Development

This page walks you through setting up a full local development environment with hot reload across the API server, the admin dashboard, the web portal and the docs site.

## Prerequisites

- **Node.js** ≥ 20.0.0 (24 recommended; the release pipeline uses 24)
- **pnpm** ≥ 10.33.1 — the version is pinned in `package.json` via `packageManager`. The easiest way to get the right version is to enable corepack:

  ```bash
  corepack enable
  corepack prepare pnpm@10.33.1 --activate
  ```

- **PostgreSQL** ≥ 16. You can install it natively or use the Postgres service from `docker/compose.yml`.

## 1. Clone and install

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl
pnpm install
```

`pnpm install` resolves the entire workspace, including the catalog-pinned versions of React, Tailwind, vite-plus, and friends. See [Monorepo Structure](./monorepo) for what these are.

## 2. Start PostgreSQL

If you do not have a local PostgreSQL, start the bundled one:

```bash
cd docker
docker compose -f compose.yml up postgres -d
cd ..
```

The default credentials match the API's defaults: user `ecoctrl`, password `ecoctrl_secret`, database `ecoctrl`, exposed on `localhost:5432`.

## 3. Configure environment files

Each app reads `.env.local` (preferred) or `.env.example` as a fallback.

```bash
# API server
cp packages/server/.env.example packages/server/.env.local
# Set DATABASE_URL and JWT_SECRET. Other variables are optional.

# Admin dashboard
cp apps/admin/.env.example apps/admin/.env.local

# Web portal — apps/web ships an .env.local with sensible defaults already.
```

A full reference for every variable lives in [Environment Variables](/reference/env-vars).

## 4. Initialize the database

The API server can create the database on first boot if your Postgres role has `CREATE DATABASE` permission. To populate the schema and seed sample data run:

```bash
cd packages/server
pnpm db:push     # push the Drizzle schema
pnpm db:seed     # insert sample users, dashboards, energy data
cd ../..
```

Other useful database scripts:

| Command | Description |
|---|---|
| `pnpm db:migrate` | Apply pending migrations from `drizzle/` |
| `pnpm db:studio` | Open Drizzle Studio in your browser |
| `pnpm db:refresh` | Drop, push, seed and open Studio. **Destructive — wipes all data.** |
| `pnpm db:generate` | Generate a new migration from current schema diff |

## 5. Run the dev servers

Run everything at once:

```bash
pnpm dev
```

Or start the apps individually:

```bash
pnpm dev:server     # API on http://localhost:3000
pnpm dev:admin      # admin on http://localhost:5173
pnpm dev:web        # web on http://localhost:8080
pnpm dev:docs       # this docs site on http://localhost:5174
```

The API server is launched with `tsx --watch` so most changes hot-reload without a restart. Both `apps/admin` and `apps/web` use Voidzero's vite-plus, which speaks the standard Vite dev server protocol.

## Useful per-app commands

Each frontend app uses the `vp` CLI from vite-plus. Run from inside `apps/admin` or `apps/web`:

```bash
vp dev      # start the dev server
vp build    # production build
vp check    # format + lint + type-check (the project's quality gate)
vp fmt      # format only
vp lint     # lint only
```

The `vp check` command is the single source of truth for code quality — it runs the formatter, linter and the type checker in one shot.

## Project conventions at a glance

- **Comments and docstrings**: English only.
- **User-facing text**: i18n via `apps/web/app/locales/` (the web portal); admin uses inline strings.
- **API route naming**: plural nouns, max two levels of nesting (`/users/:id/avatar` ✅, `/users/:id/profile/avatar` ❌).
- **Repository functions**: Prisma-style names — `createXxx`, `findManyXxx`, `findXxxByYyy`. Return `T` or `null`, not `boolean` or `void`.
- **Path aliases**:
  - `@/` → `src/` (server and admin)
  - `~/` → `app/` (web)
  - `~/components/ui` → shadcn/ui components (web)

## Where to go next

- Understand **why `vite` resolves to `vite-plus` and how `@ecoctrl/ui` is consumed as source** → [Monorepo Structure](./monorepo).
- Study the **API surface** before adding routes → [API Routes](/reference/api).
- Plan a **production deployment** → [Deployment](/reference/deployment).
