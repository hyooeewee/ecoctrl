# Getting Started

There are three supported ways to run EcoCtrl. Pick the one that matches your situation:

| You want to… | Use this path |
|---|---|
| Try it out quickly with everything in containers | [Docker Compose](#run-with-docker-compose) |
| Deploy a production build from a release artifact | [Pre-built Release](#run-from-a-pre-built-release) |
| Hack on the code locally with hot reload | See the [Development guide](./development) |

## Run with Docker Compose

This brings up PostgreSQL, the API server, the admin dashboard and the public web portal in one command.

### Prerequisites

- Docker 24+ with the Compose plugin
- Free TCP ports: `3000` (API), `4173` (admin), `8081` (web), `5432` (Postgres)

### Steps

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl/docker
cp .env.example .env.local
# Open .env.local and set JWT_SECRET (required) and BASE_URL / APP_ID for the IoT gateway (optional).
docker compose -f compose.yml up --build
```

When the build finishes, the stack is reachable at:

| Service | URL |
|---|---|
| Web portal | http://localhost:8081 |
| Admin dashboard | http://localhost:4173 |
| REST API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/documentation |

::: tip First-time login
The seeded admin account is created on the very first run. Open the admin dashboard, register or sign in, and you are ready to explore.
:::

### Stop the stack

```bash
docker compose -f compose.yml down          # keep data
docker compose -f compose.yml down -v       # also wipe Postgres volume
```

## Run from a pre-built release

Each tagged version on GitHub publishes pre-built artifacts you can drop on any Linux box that has Node.js 20+ and PostgreSQL.

### Download

Open [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases) and grab either:

- **`ecoctrl-all-vX.Y.Z.zip`** — every component pre-staged, recommended.
- Individual zips: `admin-vX.Y.Z.zip`, `web-vX.Y.Z.zip`, `server-vX.Y.Z.zip`. Extract them next to each other inside an `ecoctrl/` directory.

### Layout

After unpacking you get:

```
ecoctrl/
├── start.sh        # one-click startup script
├── admin/          # admin static files (served on port 4173)
├── web/            # web static files (served on port 8081)
└── server/         # node API bundle (port 3000)
```

### Configure and start

```bash
cd ecoctrl

# 1. Configure the server. .env.local takes precedence over .env.example.
cp server/.env.example server/.env.local
# Set DATABASE_URL, JWT_SECRET, and any optional integration credentials.

# 2. Bring everything up.
./start.sh
```

`start.sh` will:

1. Install the server's runtime dependencies (`pnpm install --prod`) the first time it runs.
2. Start the API under [pm2](https://pm2.keymetrics.io/) as `ecoctrl-server`.
3. Serve the `admin/` and `web/` static bundles on `4173` and `8081`, automatically rewriting `/api/*` and `/static/*` to the API.

You can re-run `./start.sh` at any time to get an interactive menu (`[r]` restart, `[s]` stop, `[q]` cancel).

### Manual stop

If you need to stop services without the menu:

```bash
npx pm2 delete ecoctrl-server
kill "$(cat logs/admin.pid)"
kill "$(cat logs/web.pid)"
```

## What's next

- Set up your **local development environment** with hot reload → [Development](./development).
- Understand the **monorepo layout and tooling** → [Monorepo Structure](./monorepo).
- Browse the **environment variables** you can set → [Environment Variables](/reference/env-vars).
