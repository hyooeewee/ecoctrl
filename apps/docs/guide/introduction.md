# What is EcoCtrl

EcoCtrl is an **energy and IoT control platform** that combines a 3D building visualization portal, a real-time monitoring admin dashboard, and a REST API backend into a single pnpm monorepo.

It is designed for facility teams who need to:

- Visualize multi-floor buildings and equipment in 3D, with hotspot annotations and live data overlays.
- Monitor energy consumption, faults, and IoT device states in real time.
- Manage devices, users, alerts, maintenance plans and reports from one admin console.
- Integrate with third-party IoT gateways via a typed proxy layer.

## At a glance

| Layer             | Stack                                           | Purpose                                                                 |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web`        | React Router 7 + Babylon.js + TailwindCSS v4    | Public 3D portal — building view, floors, systems, analysis             |
| `apps/admin`      | React 19 + Recharts + TailwindCSS v4            | Internal admin dashboard — accounts, devices, models, reports, settings |
| `apps/docs`       | VitePress 2                                     | This documentation site                                                 |
| `packages/server` | Fastify 5 + Drizzle ORM + PostgreSQL + Rolldown | REST API and IoT gateway proxy                                          |
| `packages/ui`     | React + Base UI + TailwindCSS v4                | Shared component library (shadcn/ui style)                              |
| `packages/shared` | Zod + TypeScript                                | Shared schemas, types and Vite tooling                                  |

## High-level architecture

```
                ┌───────────────────────────────┐
                │    Browser (web / admin)      │
                └───────────────┬───────────────┘
                                │ HTTPS
                                ▼
                ┌───────────────────────────────┐
                │   Caddy reverse proxy (TLS)   │
                │   /api/* → server  /static/*  │
                └───────────────┬───────────────┘
                                │
            ┌───────────────────┴────────────────────┐
            ▼                                        ▼
  ┌──────────────────┐                     ┌──────────────────┐
  │ Static SPA bundle │                     │ Fastify API       │
  │ (admin / web)     │                     │ Drizzle + Postgres│
  └──────────────────┘                     └──────────┬────────┘
                                                      │
                                                      ▼
                                          ┌──────────────────────┐
                                          │ Third-party IoT API  │
                                          │ (token-refreshing)   │
                                          └──────────────────────┘
```

Every client app talks to the API via a fixed `/api` prefix; the actual backend hostname is rewritten by Vite's dev proxy in development and by Caddy in production. This means **changing the API host or prefix never requires a rebuild of the frontend**.

## Where to go next

- New to the project? Start with [Getting Started](./getting-started).
- Setting up a local dev environment? See [Development](./development).
- Curious about the workspace layout and the `vite-plus` toolchain? Read [Monorepo Structure](./monorepo).
- Looking for runtime details? Check the [Architecture](/reference/architecture) and [API Routes](/reference/api) references.
