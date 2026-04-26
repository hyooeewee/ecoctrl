# Database Schema

EcoCtrl persists everything in a single PostgreSQL database. The schema is defined with [Drizzle ORM](https://orm.drizzle.team/) under `packages/server/src/schemas/`, one file per table.

## Workflow

| Command | Purpose |
|---|---|
| `pnpm db:generate` | Diff the current schema against the previous one and emit a new migration in `packages/server/drizzle/`. |
| `pnpm db:migrate` | Apply pending migrations. |
| `pnpm db:push` | Push the current schema directly (dev shortcut — no migration history). |
| `pnpm db:seed` | Insert sample users, dashboards and energy data. |
| `pnpm db:refresh` | Drop → push → seed → open Drizzle Studio. **Destructive.** |
| `pnpm db:studio` | Open Drizzle Studio against the configured database. |

Schemas re-export from `schemas/index.ts`, so any new table only needs to be added once there.

## Tables

### Identity & sessions

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Generated server-side. |
| `username` | varchar(255) | Unique-ish — also used as login identifier. |
| `password` | varchar(255) | bcrypt hash, nullable for OAuth-only accounts. |
| `email` | varchar(255) | Required, used for verification codes. |
| `role` | varchar(100) | Defaults to the lowest role from `USER_ROLE_LIST`. |
| `status` | varchar(20) | `online` / `offline`. |
| `lastLogin` | varchar(50) | Free-form timestamp string. |
| `avatarUrl` | varchar(500) | Nullable. |
| `preferences` | jsonb | UI preferences blob. |
| `createdAt` | timestamptz | `defaultNow()`. |

#### `oauth_accounts`

Links a `users.id` to one or more external providers (WeChat, Feishu).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users(id) | `ON DELETE CASCADE`. |
| `provider` | varchar(50) | `wechat`, `feishu`. |
| `providerUserId` | varchar(255) | The provider's stable user id. |
| `providerEmail` | varchar(255) | Optional. |
| `accessToken` | varchar(1000) | Provider-issued. |
| `refreshToken` | varchar(1000) | Provider-issued. |
| `expiresAt` | timestamptz | Provider-issued expiry. |

#### `refresh_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users(id) | `ON DELETE CASCADE`. |
| `tokenHash` | varchar(255) | sha256 of the issued refresh token. |
| `expiresAt` | timestamptz | 7 days from issuance. |
| `createdAt` | timestamptz | |

Each successful login deletes the user's previous refresh tokens before inserting the new one — this is the mechanism behind single-device sessions.

#### `user_settings`

Per-user dashboard layout preferences stored as a single jsonb blob, keyed by `userId`.

### IoT integration

#### `iot_tokens`

Single-row token cache for the upstream IoT gateway.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `accessToken` | text | |
| `refreshToken` | text | |
| `expiresAt` | bigint | Absolute expiry as ms-epoch. |

### Operational data

#### `alerts`

Real-time event log surfaced on the dashboard. Columns: `id`, `device`, `level`, `message`, `time`, `status` (`pending` / acknowledged).

#### `faults`

Persistent fault records. Columns: `id`, `device`, `level`, `time`, `status`, `createdAt`.

#### `fault_stats`

Single-row snapshot of fault metrics: `totalCount`, `trend`, `mttr`, `avgResponseTime`, `snapshotAt`.

#### `maintenance_reminders`

Maintenance task queue. Columns: `id`, `task`, `description`, `dueDate`, `priority`, `status`, `assignee`, `location`, `estimatedHours`, `lastCompleted`.

#### `energy_readings`

Hourly kWh readings. Columns: `id`, `hour` (string label like `09:00`), `kWh` (real), `readingAt`.

#### `energy_areas`

Per-area energy summary cards. Columns: `id`, `title`, `current`, `target`, `color`, `powerFactor`, `loadRate`.

### Dashboard configuration

#### `dashboard_stats`

Numeric KPI cards on the admin dashboard. Columns: `id`, `key`, `value`, `unit`, `trend`, `trendType`, `snapshotAt`.

#### `dashboard_widgets`

Drag-and-drop widget grid. Columns include layout metrics (`layoutX/Y/W/H`), `dataType`, a freeform `dataJson` blob, `enabled`, `hidden`, `sortOrder`.

#### `three_d_configs`

3D scene configuration consumed by `apps/web`'s Babylon scene. Stores `cameraPreset`, `ambientLightIntensity`, and JSON arrays of hotspots and labels.

### Reports & backups

#### `report_plans`, `report_templates`

Scheduled report jobs and their templates.

#### `backup_schedules`

Single-row record holding `nextBackup` (timestamp string).

### Platform & files

#### `platform_configs`

Single-row global config: platform name, refresh interval, alert toggles, timezone, backup retention, session timeout, and SMTP credentials. `syncSmtpFromEnv()` updates this row from environment variables on every boot.

#### `models`

Uploaded 3D model metadata. `fileUrl` points at `/static/models/<filename>`.

#### `files`

Generic upload metadata: name, mime type, size, fileUrl.

## Adding a new table

1. Create `packages/server/src/schemas/<name>.ts` — export the `pgTable(...)` definition.
2. Re-export it from `schemas/index.ts`.
3. Run `pnpm db:generate` and review the generated SQL migration.
4. Apply it with `pnpm db:migrate` (or `pnpm db:push` in dev).
5. Add a repository module under `repositories/<name>.ts` exposing `createXxx`, `findXxx`, etc.
6. Wire routes that need it through the repository.

Never call Drizzle directly from a route — every read/write goes through the repository layer so the routes stay focused on validation and response shaping.
