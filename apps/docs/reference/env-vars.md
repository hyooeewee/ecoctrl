# Environment Variables

Every EcoCtrl process reads its configuration from a `.env.local` file co-located with its source. `.env.local` always takes precedence over `.env.example`, which serves as a template and a fallback for missing keys.

## Server (`packages/server/.env.local`)

Loaded by `dotenv` at the top of `packages/server/index.ts`.

### Core

| Variable       | Required | Default     | Description                                                                                                                                                                         |
| -------------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | yes      | —           | PostgreSQL connection string, e.g. `postgresql://ecoctrl:ecoctrl_secret@localhost:5432/ecoctrl`. The server attempts `CREATE DATABASE` on first boot if the role has the privilege. |
| `JWT_SECRET`   | yes      | —           | Used to sign access tokens. Changing it invalidates every issued token.                                                                                                             |
| `PORT`         | no       | `3000`      | Listening port.                                                                                                                                                                     |
| `HOST`         | no       | `0.0.0.0`   | Listening host.                                                                                                                                                                     |
| `CORS_ORIGIN`  | no       | reflect any | Comma-separated allowlist (e.g. `https://app.example.com,https://admin.example.com`). When unset, the server reflects the request origin.                                           |

### Mail (verification codes)

The platform stores SMTP credentials in the `platform_configs` row; on boot, `syncSmtpFromEnv()` overwrites that row with whatever is in env. Set these once and they propagate.

| Variable      | Description                                        |
| ------------- | -------------------------------------------------- |
| `SMTP_HOST`   | SMTP relay host.                                   |
| `SMTP_PORT`   | SMTP port (default `587`).                         |
| `SMTP_USER`   | SMTP username.                                     |
| `SMTP_PASS`   | SMTP password / app password.                      |
| `SMTP_SECURE` | `true` for SMTPS (port 465), `false` for STARTTLS. |

### IoT gateway proxy (optional)

| Variable   | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `BASE_URL` | Upstream IoT gateway base URL.                             |
| `APP_ID`   | Upstream gateway application id used during token refresh. |

### Weather widget (optional)

| Variable              | Default    | Description                                                                      |
| --------------------- | ---------- | -------------------------------------------------------------------------------- |
| `OPENWEATHER_API_KEY` | —          | OpenWeatherMap API key. When empty, the weather card on the dashboard is hidden. |
| `WEATHER_LAT`         | `39.9042`  | Default latitude.                                                                |
| `WEATHER_LNG`         | `116.4074` | Default longitude.                                                               |
| `WEATHER_LOCATION`    | `Beijing`  | Display name.                                                                    |

### OAuth providers (optional)

Configured providers are returned by `GET /api/auth/oauth/providers`; if the list is empty the admin UI hides the OAuth buttons.

| Variable                        | Description          |
| ------------------------------- | -------------------- |
| `WECHAT_APPID`, `WECHAT_SECRET` | Enable WeChat login. |
| `FEISHU_APPID`, `FEISHU_SECRET` | Enable Feishu login. |

## Admin & web (`apps/{admin,web}/.env.local`)

These variables are **read by the runtime layer (Caddy in Docker), not by the JavaScript bundle**. Client code always issues requests against the literal `/api` and `/static` prefixes.

| Variable        | Default                 | Description                                                                           |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `API_BASE_URL`  | `http://localhost:3000` | Upstream API host. Inside Docker compose use the service name (`http://server:3000`). |
| `API_PREFIX`    | `/api`                  | Path prefix on the upstream that handles JSON requests.                               |
| `STATIC_PREFIX` | `/static`               | Path prefix on the upstream that serves uploaded files (3D models).                   |

::: tip Why no `VITE_*` variables here?
Putting the API host into the bundle means rebuilding for every deployment target. EcoCtrl chose to keep the API host out of the bundle entirely; only the proxy layer needs to know it. See [Architecture](/reference/architecture#runtime-topologies) for how the rewrite happens in each environment.
:::

## Docker Compose (`docker/.env.local`)

`docker/compose.yml` interpolates these into the `server` service environment:

| Variable     | Description                                     |
| ------------ | ----------------------------------------------- |
| `JWT_SECRET` | Required. Mounted into the server container.    |
| `BASE_URL`   | Optional. Forwarded to the server's `BASE_URL`. |
| `APP_ID`     | Optional. Forwarded to the server's `APP_ID`.   |

Database credentials, ports and `DATABASE_URL` are hardcoded inside `compose.yml` so the stack works out of the box. Edit the compose file if you need different credentials or different ports.

## Order of precedence

When the same variable is set in multiple places, EcoCtrl resolves it in this order (highest wins):

1. **Shell environment** — `JWT_SECRET=... node index.mjs`.
2. **Per-app `.env.local`** — `apps/admin/.env.local`, `apps/web/.env.local`, `packages/server/.env.local`.
3. **Per-app `.env.example`** — used by tests / fallbacks only.
4. **Built-in defaults** inside the server.
