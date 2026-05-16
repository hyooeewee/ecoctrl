# Deployment

EcoCtrl supports two production deployment shapes:

| Shape                                       | Best for                     | What you need             |
| ------------------------------------------- | ---------------------------- | ------------------------- |
| [Docker Compose](#docker-compose)           | Single-host deploys, on-prem | Docker 24+                |
| [Pre-built release zip](#pre-built-release) | Bare Linux hosts, no Docker  | Node 20+, PostgreSQL, pm2 |

## Docker Compose

Three compose files are provided for different scenarios:

| File                 | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `compose.yml`        | Pre-built images from GHCR (default)                  |
| `compose.build.yaml` | Build all images from local Dockerfiles               |
| `compose.dev.yaml`   | Development overlay with volume mounts and hot reload |

### Pre-built deployment (default)

This brings up PostgreSQL, the API server, the admin dashboard and the public web portal in one command.

The simplest path. `docker/compose.yml` defines four services: PostgreSQL, the API server, the admin SPA bundle, and the web SPA bundle. The two SPA images bundle the static assets behind Caddy, which rewrites `/api/*` and `/static/*` to the API container.

### One-time setup

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl/docker
cp .env.example .env.local
$EDITOR .env.local        # set JWT_SECRET (required) and IoT credentials (optional)
```

:::tabs
== Online deployment (default)

If the target host can reach GHCR and Docker Hub, run the `docker compose` command below directly.

== Offline deployment (no internet)

If the target machine cannot reach external registries, <a href="https://bucket.godot.qzz.io/images/latest/ecoctrl.zip" download>download the offline bundle</a> and run:

```bash
unzip ecoctrl.zip
cd ecoctrl-docker
sh migrate-images.sh compose.yaml --load ecoctrl-images.tar
docker compose up -d
```

The bundle contains pre-pulled images (including PostgreSQL), `compose.yaml`, and the load script. No external registry access is required.
:::

### Run

```bash
docker compose -f compose.yml up --build
```

Services:

| Service         | Port | URL                                |
| --------------- | ---- | ---------------------------------- |
| Web portal      | 8081 | `http://<host>:8081`               |
| Admin dashboard | 4173 | `http://<host>:4173`               |
| REST API        | 3000 | `http://<host>:3000`               |
| Swagger UI      | 3000 | `http://<host>:3000/documentation` |
| PostgreSQL      | 5432 | internal                           |

### Customizing

- **Backend host**: edit `apps/admin/.env.local` and `apps/web/.env.local` to point `API_BASE_URL` at your real backend (or a service name within compose).
- **Database credentials**: change `POSTGRES_USER/PASSWORD/DB` in `compose.yml` and update `DATABASE_URL` accordingly.
- **CORS**: set `CORS_ORIGIN=https://app.example.com,https://admin.example.com` in the server's environment.

### Stop

```bash
docker compose -f compose.yml down          # keep data
docker compose -f compose.yml down -v       # also wipe Postgres volume
```

::: warning
The `compose.yml` Caddyfile is configured for plain HTTP. In production, terminate TLS in front of these containers (Caddy on the host, Cloudflare, an ALB, etc.) and route to the SPA containers over the internal network.
:::

## Pre-built release

GitHub Releases publishes pre-staged zips for every tagged version. They contain the SPA bundles and a Rolldown-bundled server with auto-generated `dist/package.json` listing only runtime dependencies — install with `pnpm install --prod`.

### Download

:::tabs
== GitHub Releases

From [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases):

- **`ecoctrl-vX.Y.Z.zip`** — recommended. Contains everything, ready for `start.mjs`.
- Component zips: `admin-vX.Y.Z.zip`, `web-vX.Y.Z.zip`, `server-vX.Y.Z.zip`. Extract them next to each other.

== R2 Mirror (China)

If GitHub Releases is slow or unreachable, download from our Cloudflare R2 mirror (same files, synced on every release):

- **Full bundle**: <a href="https://bucket.godot.qzz.io/releases/latest/ecoctrl.zip" download>ecoctrl.zip ↓</a>
- **Admin only**: <a href="https://bucket.godot.qzz.io/releases/latest/admin.zip" download>admin.zip ↓</a>
- **Web only**: <a href="https://bucket.godot.qzz.io/releases/latest/web.zip" download>web.zip ↓</a>
- **Server only**: <a href="https://bucket.godot.qzz.io/releases/latest/server.zip" download>server.zip ↓</a>

:::

### Layout after unpacking

```
ecoctrl/
├── start.mjs
├── server/
│   ├── index.mjs
│   ├── package.json
│   ├── ecoctrl.config.cjs   # pm2 config for the server
│   └── .env.example         # copy to .env.local
├── admin/                   # static build
└── web/                     # static build
```

### Configure

```bash
cd ecoctrl
cp server/.env.example server/.env.local
$EDITOR server/.env.local       # DATABASE_URL, JWT_SECRET, optional IoT/OAuth/SMTP

# Optional: override per-app proxy targets if API isn't on http://localhost:3000
echo 'API_BASE_URL=https://api.example.com' > admin/.env.local
echo 'API_BASE_URL=https://api.example.com' > web/.env.local
```

### Start

```bash
node start.mjs
```

`start.mjs` will:

1. Run `pnpm install --prod` inside `server/` on the first launch.
2. Start the API under pm2 as `ecoctrl-server`.
3. Serve `admin/` on `:4173` and `web/` on `:8081` via [`local-web-server`](https://github.com/lwsjs/local-web-server) with `--rewrite "/api/(.*) -> $API_BASE_URL$API_PREFIX/$1"`.

Re-run the script for an interactive menu (`[r]` restart, `[s]` stop, `[q]` cancel).

### Manual stop

```bash
npx pm2 delete ecoctrl-server
kill "$(cat logs/admin.pid)"
kill "$(cat logs/web.pid)"
```

### Reverse proxy in front

Both the SPA servers and the API listen on plain HTTP. A typical production frontend pairs them with a TLS-terminating proxy. For Caddy:

```nginx
app.example.com {
    reverse_proxy localhost:8081      # web portal
}

admin.example.com {
    reverse_proxy localhost:4173      # admin
}

api.example.com {
    reverse_proxy localhost:3000      # API server
}
```

Then point `API_BASE_URL=https://api.example.com` in both `admin/.env.local` and `web/.env.local`. The SPA bundles do not need to be rebuilt.

## Build from source

If you want to build artifacts yourself instead of using release zips:

```bash
pnpm install
pnpm build:admin    # → apps/admin/dist/
pnpm build:web      # → apps/web/build/
pnpm build:server   # → packages/server/dist/{index.mjs, package.json}
```

The server build's auto-generated `dist/package.json` lists only the runtime dependencies pulled out of the bundle, so a copy of `server/` plus `pnpm install --prod` is enough to run it.

## Production checklist

Before exposing EcoCtrl to the public internet:

```markdown
- [ ] Set a strong `JWT_SECRET` and rotate any defaults.
- [ ] Restrict `CORS_ORIGIN` to your real domains.
- [ ] Use a managed PostgreSQL (or harden your own — TLS, backup, monitoring).
- [ ] Enable HTTPS at the proxy layer for `admin.*`, `app.*`, `api.*`.
- [ ] Configure SMTP — without it, registration / password-reset codes fail silently.
- [ ] If using OAuth, register the production callback URLs with each provider.
- [ ] Schedule database backups (the platform's `backup_schedules` row only stores the _next_ timestamp; real backups are still your responsibility).
- [ ] Limit database role privileges in production: revoke `CREATE DATABASE` so the bootstrap auto-create only runs in dev.
- [ ] Forward server logs to an aggregator (Fastify uses pino — JSON-on-stdout works with everything).
```
