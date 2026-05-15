# API Routes

The full, authoritative API reference is the OpenAPI document Fastify generates from the Zod schemas at runtime — open `http://localhost:3000/documentation` (Swagger UI). This page summarizes the route map and the conventions every endpoint follows.

## Conventions

- **Prefix**: every route lives under `/api`. Inside the codebase, `routes/index.ts` registers `apiRoutes` with `prefix: "/api"`.
- **JSON only.** Responses are JSON; the only exception is `GET /api/files/:id/preview`, which streams the underlying binary.
- **Plural noun resources.** A typical resource exposes `GET /api/<resource>`, `POST /api/<resource>`, `GET /api/<resource>/:id`, `PUT /api/<resource>/:id`, `DELETE /api/<resource>/:id`.
- **Validation via Zod.** Every body, querystring and response is validated. Invalid input returns `400` with a Zod error body; missing or expired auth returns `401`.
- **Error shape**: `{ "error": "..." }` for client errors. Server errors come from Fastify's default formatter.
- **Auth header**: `Authorization: Bearer <accessToken>`. The default token lifetime is 15 minutes — use `/api/auth/refresh` to rotate.

## Public routes (no token)

These are the only paths the global `onRequest` hook lets through:

| Method   | Path                                                        | Purpose                                                                        |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| POST     | `/api/auth/login`                                           | Username/email + password login.                                               |
| POST     | `/api/auth/register`                                        | Create a user. Requires the verification code from `/auth/register/send-code`. |
| POST     | `/api/auth/register/send-code`                              | Email a 6-digit code (5-minute TTL).                                           |
| POST     | `/api/auth/refresh`                                         | Exchange a refresh token for a new access + refresh pair.                      |
| POST     | `/api/auth/forgot-password/send-code`                       | Email a password-reset code.                                                   |
| POST     | `/api/auth/forgot-password/reset`                           | Reset password with the code.                                                  |
| GET      | `/api/auth/oauth/providers`                                 | List configured OAuth providers.                                               |
| GET/POST | `/api/auth/oauth/wechat/...`, `/api/auth/oauth/feishu/...`  | OAuth start/callback.                                                          |
| POST     | `/api/auth/oauth/bind`, `/api/auth/oauth/register-and-bind` | Link an OAuth identity to an account.                                          |
| GET      | `/api/public/dashboard`                                     | Public read-only dashboard payload (used by `apps/web`).                       |
| POST     | `/api/webhook`                                              | Workflow webhook trigger (public).                                             |

Everything else is protected.

## Route map

### `/api/auth/*`

| Method | Path                              | Summary                                      |
| ------ | --------------------------------- | -------------------------------------------- |
| POST   | `/auth/login`                     | Login with username and password             |
| POST   | `/auth/register`                  | Register a new user                          |
| POST   | `/auth/register/send-code`        | Send registration verification code          |
| POST   | `/auth/refresh`                   | Refresh access token (rotates refresh token) |
| POST   | `/auth/logout`                    | Invalidate the current refresh token         |
| POST   | `/auth/forgot-password/send-code` | Send password-reset code                     |
| POST   | `/auth/forgot-password/reset`     | Reset password with code                     |
| GET    | `/auth/me`                        | Current user                                 |

### `/api/auth/oauth/*`

| Method   | Path                              | Summary                                             |
| -------- | --------------------------------- | --------------------------------------------------- |
| GET      | `/auth/oauth/providers`           | Available OAuth providers                           |
| GET      | `/auth/oauth/:provider/authorize` | Begin authorization (returns provider redirect URL) |
| GET/POST | `/auth/oauth/:provider/callback`  | Provider callback                                   |
| POST     | `/auth/oauth/bind`                | Link to an existing account                         |
| POST     | `/auth/oauth/register-and-bind`   | Create an account from a provider profile           |

### `/api/users/*`

User CRUD, role and avatar management. All endpoints are protected.

### `/api/overview/*`

`GET /overview/stats` — KPI cards. `GET /overview/energy-chart` — chart data.

### `/api/energy/*`

`GET /energy/areas` and `PUT /energy/areas` — per-area summary cards.

### `/api/alerts/*`, `/api/faults/*`, `/api/maintenance/*`

CRUD endpoints over the matching tables. `/faults/stats` returns the snapshot row.

### `/api/reports/*`

Report plans CRUD and report templates listing. Note: there are no `/instances` endpoints; generated reports are retrieved through the queue worker output.

### `/api/configs`

`GET` and `PUT` for the single-row platform configuration.

### `/api/files/*`

| Method | Path                 | Notes                                  |
| ------ | -------------------- | -------------------------------------- |
| GET    | `/files`             | List uploads.                          |
| POST   | `/files`             | Multipart upload, max 100 MB per file. |
| GET    | `/files/:id`         | Metadata only.                         |
| GET    | `/files/:id/preview` | Stream the binary.                     |
| DELETE | `/files/:id`         | Remove.                                |

### `/api/models/*`

Equivalent to `/files` but specialized for 3D model uploads. Files land in `uploads/models/` and are exposed at `/static/models/<filename>`. Note: there is no `GET /models/:id`; use `GET /models/:id/file` to stream the model binary.

### `/api/iot/*`

Proxy layer for the upstream IoT gateway. Inputs and outputs match the upstream contract; EcoCtrl handles token refresh transparently using the `iot_tokens` row.

| Method | Path                                     | Description                      |
| ------ | ---------------------------------------- | -------------------------------- |
| GET    | `/iot/token`                             | Returns the cached access token. |
| POST   | `/iot/codes/values`                      | Read current point values.       |
| POST   | `/iot/codes/history`                     | Historical values for a point.   |
| POST   | `/iot/codes/set`, `/iot/codes/force-set` | Write back.                      |
| POST   | `/iot/alarms`, `/iot/alarm-configs`      | Alarm history and configuration. |

### `/api/system/*`

`GET /system/backup-schedule`, `PUT /system/backup-schedule`.

### `/api/workflows/*`

Workflow CRUD and execution. All endpoints are protected.

| Method | Path                        | Summary                               |
| ------ | --------------------------- | ------------------------------------- |
| GET    | `/workflows`                | List all workflows                    |
| POST   | `/workflows`                | Create a new workflow                 |
| GET    | `/workflows/:id`            | Get a single workflow definition      |
| PUT    | `/workflows/:id`            | Update workflow definition            |
| DELETE | `/workflows/:id`            | Delete a workflow                     |
| POST   | `/workflows/:id/trigger`    | Execute a workflow manually           |
| GET    | `/workflows/:id/executions` | List execution history for a workflow |

### `/api/objects/*`

IoT object metadata CRUD. Objects represent physical devices or data points in the upstream IoT gateway.

| Method | Path           | Summary            |
| ------ | -------------- | ------------------ |
| GET    | `/objects`     | List objects       |
| POST   | `/objects`     | Create an object   |
| GET    | `/objects/:id` | Get object details |
| PUT    | `/objects/:id` | Update object      |
| DELETE | `/objects/:id` | Delete object      |

### `/api/settings/*`

Per-user settings (protected).

| Method | Path        | Summary              |
| ------ | ----------- | -------------------- |
| GET    | `/settings` | Get user settings    |
| PUT    | `/settings` | Update user settings |

### `/api/public/settings/*`

Public platform configuration (no token).

| Method | Path               | Summary                    |
| ------ | ------------------ | -------------------------- |
| GET    | `/public/settings` | Get public platform config |

### `/api/dashboard-model/*`

3D scene configuration.

| Method | Path               | Summary                |
| ------ | ------------------ | ---------------------- |
| GET    | `/dashboard-model` | Get 3D scene config    |
| PUT    | `/dashboard-model` | Update 3D scene config |

### `/api/webhook`

Public webhook endpoint for workflow triggers.

| Method | Path             | Summary                                |
| ------ | ---------------- | -------------------------------------- |
| POST   | `/webhook/:slug` | Trigger a workflow by its webhook slug |

## Swagger auto-login

`/documentation` includes a small inline script that:

1. Captures the response of `POST /auth/login` and `POST /auth/refresh`.
2. Stores the access and refresh tokens in `localStorage`.
3. Calls Swagger's `authActions.authorize` to apply the bearer token automatically.
4. Auto-fills the refresh token body on subsequent `/auth/refresh` calls.

Practically: **log in once via the Swagger UI's "Try it out" on `/auth/login`, then every other endpoint is unlocked.**

## Adding a new route

1. Create `packages/server/src/routes/<resource>.ts` exporting an async function `(fastify) => { ... }`.
2. Define request/response Zod schemas inline or in a dedicated module.
3. Implement the handler — call into `repositories/<resource>.ts`, never Drizzle directly.
4. Register the file in `routes/index.ts` with the desired prefix.
5. If the route should bypass auth, add it to `publicPaths` in the same file. Otherwise it inherits the JWT gate.

Adding a route automatically adds it to the OpenAPI document — no manual maintenance.
