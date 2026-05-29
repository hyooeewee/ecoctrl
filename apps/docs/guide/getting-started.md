# Getting Started

There are two supported ways to run EcoCtrl. Pick the one that matches your situation:

| You want to…                                     | Use this path                              |
| ------------------------------------------------ | ------------------------------------------ |
| Try it out quickly with everything in containers | [Docker Compose](#run-with-docker-compose) |
| Hack on the code locally with hot reload         | See the [Development guide](./development) |

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

| Service         | URL                                 |
| --------------- | ----------------------------------- |
| Web portal      | http://localhost:8081               |
| Admin dashboard | http://localhost:4173               |
| REST API        | http://localhost:3000               |
| Swagger UI      | http://localhost:3000/documentation |

::: tip First-time login
The seeded admin account is created on the very first run. The default credentials are `admin` / the password printed by `pnpm db:seed` (or set via `INITIAL_ADMIN_PASSWORD` in `.env.local`). Open the admin dashboard at http://localhost:4173 and sign in.
:::

### Stop the stack

```bash
docker compose -f compose.yml down          # keep data
docker compose -f compose.yml down -v       # also wipe Postgres volume
```

## What's next

- Set up your **local development environment** with hot reload → [Development](./development).
- Understand the **monorepo layout and tooling** → [Monorepo Structure](./monorepo).
- Browse the **environment variables** you can set → [Environment Variables](/reference/env-vars).
