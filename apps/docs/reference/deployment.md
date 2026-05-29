# Deployment

EcoCtrl ships as Docker images published to GHCR. The recommended way to run in production is Docker Compose.

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
