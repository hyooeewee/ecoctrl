# FAQ

Solutions to the questions and gotchas that come up most often when setting up or operating EcoCtrl.

## Setup

### `pnpm install` complains about the Node version

The release pipeline uses Node 24, and several dependencies declare `engines.node >= 20`. If you see `Unsupported engine`, switch to a supported version:

```bash
nvm install 24 && nvm use 24
# or with fnm:
fnm install 24 && fnm use 24
```

### `pnpm install` is slow / wrong pnpm version

The repo pins `pnpm@10.33.1`. Use corepack to make sure you are running the same version:

```bash
corepack enable
corepack prepare pnpm@10.33.1 --activate
```

### The API exits with `database "ecoctrl" does not exist`

By default the API tries to create the database on first boot if your Postgres role has the `CREATE DATABASE` privilege. On managed services that disallow that privilege, create the database yourself first:

```sql
CREATE DATABASE ecoctrl;
```

then re-run `pnpm db:push` and `pnpm db:seed`.

### `db:push` succeeded but the admin says "no data"

You also need the seed data:

```bash
cd packages/server
pnpm db:seed
```

If you want to start over completely, `pnpm db:refresh` performs **drop → push → seed → open Drizzle Studio**. It is destructive — never run it against a production database.

## Authentication

### Why am I getting logged out every 15 minutes?

Access tokens are intentionally short-lived (15 minutes). The frontend automatically calls `/api/auth/refresh` to obtain a new one as long as a valid refresh token is present. If you are forcibly logged out:

- Check the browser console for refresh failures.
- Confirm `JWT_SECRET` did not change between server restarts (an updated secret invalidates every existing token).

### "Logging in on a second device kicked me out from the first"

Yes — by design. EcoCtrl currently issues a single active refresh token per user. Logging in on a new device clears refresh tokens from previous sessions. If your team needs multi-device support, that is a server-side change (see `routes/auth.ts`).

### OAuth login button does nothing

The button opens a popup window. Pop-ups must be allowed for the admin domain. The available providers are returned by `GET /api/auth/oauth/providers` — if that list is empty, no OAuth credentials are configured in the server `.env.local`.

## 3D portal

### The building view shows a black screen

The web portal expects `apps/web/public/building.glb`. If that file is missing or corrupt the Babylon scene fails silently. Verify it exists and is valid glTF binary.

### How do I tweak camera, lights or hotspots?

All 3D parameters are stored in `useSettingsStore` (`apps/web/app/store/settings.ts`) and synced through `/api/dashboard/settings`. Open the admin dashboard, go to **3D Configuration**, change values and save. The web portal picks them up on its next reload.

## Builds and deployment

### `vp build` fails with "Cannot find module @ecoctrl/ui/..."

`@ecoctrl/ui` is consumed as **source**, so you do not need to build it separately. If imports fail, make sure `pnpm install` finished successfully and that `apps/<your-app>/vite.config.ts` includes the `resolveUiAlias()` plugin from `@ecoctrl/shared`.

### Docker build error: "workspace package not found"

Docker images must be built from the monorepo root, not from the app's directory:

```bash
docker build -f apps/admin/Dockerfile .
```

The Dockerfiles assume `pnpm-lock.yaml` and the entire workspace are present.

### Changing `API_BASE_URL` doesn't seem to update the frontend

Frontend code addresses the API as `/api` literally — that prefix is rewritten at runtime:

- In dev: by Vite's proxy (`createDevProxy`).
- In containers: by Caddy.
- In release zips: by `start.mjs` and `lws --rewrite`.

You **don't** need to rebuild the frontend after changing the host or prefix; just update the matching env variable on the runtime layer (see [Environment Variables](/reference/env-vars)).

## Documentation site

### Why is `/api/dashboard` accessible without a token?

It is intentionally on the public allowlist so the public web portal can render building stats without forcing visitors to log in. Mutating endpoints under `/api/dashboard/settings` still require authentication.

### My local docs server doesn't open

Run `pnpm dev:docs` from the repo root. The docs site listens on port `5174` to avoid clashing with admin (`5173`).

## Where to file an issue

If you hit something that isn't covered here:

1. Search [GitHub issues](https://github.com/hyooeewee/ecoctrl/issues) first.
2. Open a new issue with the failing command, the full error and your environment (`node -v`, `pnpm -v`, OS).
