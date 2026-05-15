# Architecture

This page is the runtime view of EcoCtrl: how requests flow, where responsibilities live, and what each piece is built on. For the workspace layout and tooling, see [Monorepo Structure](/guide/monorepo).

## High-level diagram

```
                        ┌────────────────────────┐
                        │       Browser          │
                        │  apps/web │ apps/admin │
                        └───────────┬────────────┘
                                    │ /api  /static
                                    ▼
                ┌──────────────────────────────────────┐
                │   Reverse proxy (Caddy in Docker /   │
                │   lws --rewrite in release zips /    │
                │   Vite dev proxy in development)     │
                └───────────┬──────────────────────────┘
                            │
                ┌───────────▼──────────────┐
                │  packages/server         │
                │  Fastify 5 + Zod         │
                │  ─ JWT + Refresh tokens  │
                │  ─ /api routes           │
                │  ─ /static/models/* fs   │
                │  ─ /documentation (Swagger)│
                └───────────┬──────────────┘
                            │
        ┌───────────────────┼─────────────────────────┐
        ▼                   ▼                         ▼
  ┌───────────┐    ┌──────────────────┐    ┌──────────────────┐
  │ PostgreSQL │    │  Local file      │    │ External IoT     │
  │  Drizzle   │    │  uploads dir     │    │ gateway (token   │
  │  ORM       │    │  /static/models  │    │ refreshing)      │
  └───────────┘    └──────────────────┘    └──────────────────┘
```

The frontend bundles always issue requests against the literal `/api` and `/static` prefixes; the layer in front of them rewrites those to the real backend host. Changing the backend host or path prefix is a runtime config change, never a rebuild.

## Frontend apps

### `apps/web` — public 3D portal

- React Router 7 in framework mode
- Babylon.js scene (`apps/web/public/building.glb` + `useSettingsStore`)
- TailwindCSS v4
- Self-rolled i18n: `apps/web/app/locales/{en,zh}/*.json` exposed through a Zustand store
- Client only — server-side rendering is not used; the bundle is served as static files

### `apps/admin` — internal dashboard

- React 19 SPA, **tab-based** routing (state in `App.tsx`, not React Router)
- Recharts for analytics, Base UI primitives for components
- Reads from `/api/*` only; the seeded admin user is created on first run

### Shared frontend conventions

- Path alias `@/` (admin) and `~/` (web) point at each app's local source
- `~/components/ui` (web) holds project-local shadcn copies, while shared library code lives in `@ecoctrl/ui`
- Each app's `vite.config.ts` extends `@ecoctrl/shared`'s `viteConfig` and registers `resolveUiAlias()` so `@ecoctrl/ui` source compiles inside the consumer

## Backend (`packages/server`)

The server is a single Fastify 5 process started from `packages/server/index.ts`:

```ts
await fastify.register(databasePlugin);
await fastify.register(fastifyJwt, { secret, sign: { expiresIn: "15m" } });
await fastify.register(cors, { origin: process.env.CORS_ORIGIN?.split(",") || true });
await fastify.register(multipart, { limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
await fastify.register(fastifyStatic, { root: "uploads/models", prefix: "/static/models/" });
await fastify.register(swagger, { ... }); // OpenAPI from Zod schemas
await fastify.register(swaggerUi, { routePrefix: "/documentation", ... });
await fastify.register(apiRoutes, { prefix: "/api" });
```

Key facts:

- **Type provider**: `fastify-type-provider-zod` — every route's body, querystring and response are validated with Zod schemas, and the same schemas drive the OpenAPI document.
- **Auth gate**: a single `onRequest` hook in `routes/index.ts` rejects every `/api/*` request that doesn't carry a JWT, with an explicit allow-list (login, register, refresh, OAuth, public dashboard read).
- **Static serving**: uploaded 3D models live on disk under `uploads/models/` and are exposed at `/static/models/*`.
- **Database access**: a Fastify plugin opens the Drizzle pool once and decorates `fastify.db` so every repository talks to the same connection.
- **Bootstrap**: `ensureDatabase()` and `syncSmtpFromEnv()` run before the server listens — they ensure the database exists (when permitted) and copy SMTP credentials from `.env.local` into the platform config row.

### Layered code structure

```
packages/server/src/
├── routes/         # HTTP layer — validation, auth, error mapping
├── services/       # Cross-cutting workflows (e.g. IoT proxy, mail)
├── repositories/   # Database access functions (createXxx, findXxx)
├── schemas/        # Drizzle table schemas (one file per table)
├── plugins/        # Fastify plugins (database)
├── lib/            # Pure helpers (paths, mailer, ensureDatabase)
└── config/         # Environment-driven configuration
```

Repository functions follow Prisma-style naming (`createXxx`, `findManyXxx`, `findXxxByYyy`) and return `T | null` rather than `boolean`. Routes never import Drizzle directly; they go through the repository layer.

## Build pipeline

| Package                          | Tool                              | Output                                              |
| -------------------------------- | --------------------------------- | --------------------------------------------------- |
| `apps/web`, `apps/admin`         | `vp build` (vite-plus + Rolldown) | static SPA bundle                                   |
| `packages/server`                | `rolldown`                        | `dist/index.mjs` + auto-emitted `dist/package.json` |
| `apps/docs`                      | `vitepress build`                 | static site under `.vitepress/dist/`                |
| `packages/ui`, `packages/shared` | none — consumed as source         | n/a                                                 |

The server's Rolldown config externalizes every bare specifier and Node built-in. A custom plugin then walks the bundle's external imports, looks each version up in the source `package.json`, and writes a fresh `dist/package.json` listing only the runtime dependencies. The released zip can therefore be installed on any host with `pnpm install --prod`.

See [Deployment](/reference/deployment) for how these outputs are packaged into release zips and Docker images.

## Runtime topologies

EcoCtrl supports three runtime shapes, all sharing the same compiled code:

### Local development

```
node tsx --watch  ──►  Fastify (3000)
vite-plus dev     ──►  admin (5173)
vite-plus dev     ──►  web   (8080)
vitepress dev     ──►  docs  (5174)
```

`createDevProxy(API_BASE_URL)` in `@ecoctrl/shared` returns a Vite proxy block that forwards `/api` and `/static` to the API only when the host is `localhost` — so deploying the same Vite config behind a real domain doesn't double-proxy.

### Docker Compose (`docker/compose.yml`)

```
postgres:16-alpine      :5432
ecoctrl-server (Node)   :3000
ecoctrl-admin (Caddy)   :4173 → /api /static rewritten to http://server:3000
ecoctrl-web   (Caddy)   :8081 → /api /static rewritten to http://server:3000
```

Per-app Dockerfiles produce small images: the SPA bundle plus a Caddyfile that rewrites the API/static prefixes. The compose file mounts each app's `.env.local` so backend host and prefix are configurable without rebuilding.

### Release zip (`ecoctrl-vX.Y.Z.zip`)

```
ecoctrl/
├── start.sh          # interactive menu — start, restart, stop
├── server/...        # node bundle + auto-generated package.json
├── admin/...         # static files
└── web/...           # static files
```

`start.sh` runs the server under pm2 (`ecoctrl-server`) and serves `admin/` and `web/` with [`local-web-server`](https://github.com/lwsjs/local-web-server)'s `--rewrite` flag, replicating Caddy's behavior without requiring it. The same `.env.local` files drive the rewrites.

## IoT proxy layer

Routes under `/api/iot/*` proxy a third-party gateway. The token-refresh logic is centralized:

- `iot_tokens` row stores the access/refresh pair and absolute expiry in milliseconds.
- A service helper checks expiry on every outbound call, refreshes when needed, and persists the new pair.
- Clients call EcoCtrl, never the upstream — credentials never reach the browser.

## Workflow engine

The workflow engine (`packages/server/src/engine/`) executes DAGs defined in a JSON DSL. Each workflow has a trigger (state-change, schedule, manual, webhook or event) and a node graph.

- **`validator.ts`** — validates the DSL structure (node IDs, edge connectivity, required fields).
- **`expr.ts`** — lightweight expression evaluator for conditions and variable interpolation.
- **`trigger.ts`** — evaluates whether a trigger should fire given incoming data.
- **`executor.ts`** — runs the node graph sequentially, maintaining an `ExecutionContext` (variables, node outputs, env).
- **`template.ts`** — string templating for HTTP request bodies, email subjects, etc.

Nodes are divided into **control** nodes (`start`, `end`, `condition`, `switch`, `loop`, `parallel`, `delay`) and **action** nodes (`http_request`, `database`, `email`, `variable`). Each node can declare an `onError` handler with strategies: `retry`, `skip`, `abort` or `goto` a specific node.

The admin dashboard provides a visual editor (`WorkflowCanvas.tsx` powered by XYFlow). Workflows are persisted in the `workflows` table and executed either manually, on schedule via pg-boss, or via the public `POST /api/webhook/:slug` endpoint.

## Queue & worker system

`packages/server` uses [pg-boss](https://github.com/timgit/pg-boss) for background job processing:

- **`queue/pgboss.ts`** — initializes the pg-boss instance against the same PostgreSQL database.
- **`queue/worker.ts`** — registers job handlers (report generation, backup tasks, workflow execution).

Jobs are enqueued with `boss.send('queue-name', payload, options)` and processed by the worker in the same Node process. In production the worker runs alongside the API server; in development it starts automatically. Failed jobs are retried with exponential backoff up to a configurable limit.

## Dashboard widgets

`apps/web` renders a drag-and-drop widget grid on the public portal. Widget types include stat cards, charts, lists, weather and energy charts. Layout metrics (`layoutX`, `layoutY`, `layoutW`, `layoutH`) and data binding (`dataType`, `dataJson`) are stored in the `dashboard_widgets` table. The weather widget requires `OPENWEATHER_API_KEY`; when absent it is hidden automatically.

## 3D model pipeline

3D models are uploaded through the admin dashboard (`ModelFileZone.tsx` + `ModelViewer.tsx`) and stored on disk under `uploads/models/`. The `models` table tracks metadata; `dashboard_models` stores scene configuration (camera preset, ambient light intensity, hotspot positions and labels). The web portal loads the model via Babylon.js (`building-view.tsx`) and the public endpoint `GET /api/public/model`.

## Documentation site (`apps/docs`)

VitePress 2 with [bilingual locales](https://vitepress.dev/guide/i18n): English at root and 简体中文 at `/zh/`. Content lives under `apps/docs/{guide,reference,zh}` and the site is deployed to `ecoctrl.godot.run`. Public read access to runtime stats is enabled by exposing only `GET /api/public/dashboard` on the public allowlist.
