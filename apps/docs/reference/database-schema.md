# Database Schema

EcoCtrl persists everything in a single PostgreSQL database. The schema is defined with [Drizzle ORM](https://orm.drizzle.team/) under `packages/server/src/schemas/`, one file per table.

## Workflow

| Command            | Purpose                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `pnpm db:generate` | Diff the current schema against the previous one and emit a new migration in `packages/server/drizzle/`. |
| `pnpm db:migrate`  | Apply pending migrations.                                                                                |
| `pnpm db:push`     | Push the current schema directly (dev shortcut — no migration history).                                  |
| `pnpm db:seed`     | Insert sample users, dashboards and energy data.                                                         |
| `pnpm db:refresh`  | Drop → push → seed → open Drizzle Studio. **Destructive.**                                               |
| `pnpm db:studio`   | Open Drizzle Studio against the configured database.                                                     |

Schemas re-export from `schemas/index.ts`, so any new table only needs to be added once there.

## Tables

### Identity & sessions

#### `users`

| Column        | Type         | Notes                                              |
| ------------- | ------------ | -------------------------------------------------- |
| `id`          | uuid PK      | Generated server-side.                             |
| `username`    | varchar(255) | Unique-ish — also used as login identifier.        |
| `password`    | varchar(255) | bcrypt hash, nullable for OAuth-only accounts.     |
| `email`       | varchar(255) | Required, used for verification codes.             |
| `role`        | varchar(100) | Defaults to the lowest role from `USER_ROLE_LIST`. |
| `status`      | varchar(20)  | `online` / `offline`.                              |
| `lastLogin`   | varchar(50)  | Free-form timestamp string.                        |
| `avatarUrl`   | varchar(500) | Nullable.                                          |
| `preferences` | jsonb        | UI preferences blob.                               |
| `createdAt`   | timestamptz  | `defaultNow()`.                                    |

#### `oauth_accounts`

Links a `users.id` to one or more external providers (WeChat, Feishu).

| Column           | Type                | Notes                          |
| ---------------- | ------------------- | ------------------------------ |
| `id`             | uuid PK             |                                |
| `userId`         | uuid FK → users(id) | `ON DELETE CASCADE`.           |
| `provider`       | varchar(50)         | `wechat`, `feishu`.            |
| `providerUserId` | varchar(255)        | The provider's stable user id. |
| `providerEmail`  | varchar(255)        | Optional.                      |
| `accessToken`    | varchar(1000)       | Provider-issued.               |
| `refreshToken`   | varchar(1000)       | Provider-issued.               |
| `expiresAt`      | timestamptz         | Provider-issued expiry.        |

#### `refresh_tokens`

| Column      | Type                | Notes                               |
| ----------- | ------------------- | ----------------------------------- |
| `id`        | uuid PK             |                                     |
| `userId`    | uuid FK → users(id) | `ON DELETE CASCADE`.                |
| `tokenHash` | varchar(255)        | sha256 of the issued refresh token. |
| `expiresAt` | timestamptz         | 7 days from issuance.               |
| `createdAt` | timestamptz         |                                     |

Each successful login deletes the user's previous refresh tokens before inserting the new one — this is the mechanism behind single-device sessions.

#### `user_settings`

Per-user dashboard layout preferences stored as a single jsonb blob, keyed by `userId`.

### IoT integration

#### `iot_tokens`

Single-row token cache for the upstream IoT gateway.

| Column         | Type      | Notes                        |
| -------------- | --------- | ---------------------------- |
| `id`           | serial PK |                              |
| `accessToken`  | text      |                              |
| `refreshToken` | text      |                              |
| `expiresAt`    | bigint    | Absolute expiry as ms-epoch. |

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

#### `dashboard_widgets`

Drag-and-drop widget grid. Columns include layout metrics (`layoutX/Y/W/H`), `dataType`, a freeform `dataJson` blob, `enabled`, `hidden`, `sortOrder`.

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

### Workflow engine

#### `workflows`

Workflow definitions stored as a JSON DSL.

| Column        | Type        | Notes                                     |
| ------------- | ----------- | ----------------------------------------- |
| `id`          | uuid PK     |                                           |
| `name`        | varchar     | Human-readable name                       |
| `description` | text        | Optional                                  |
| `dsl`         | jsonb       | Full workflow DSL (nodes, edges, trigger) |
| `enabled`     | boolean     | Whether the workflow is active            |
| `createdAt`   | timestamptz |                                           |
| `updatedAt`   | timestamptz |                                           |

#### `workflow_executions`

Execution logs for each workflow run.

| Column        | Type        | Notes                              |
| ------------- | ----------- | ---------------------------------- |
| `id`          | uuid PK     |                                    |
| `workflowId`  | uuid FK     | → workflows(id)                    |
| `status`      | varchar     | `completed` / `failed` / `running` |
| `triggerData` | jsonb       | Data that fired the trigger        |
| `result`      | jsonb       | Final output and node logs         |
| `startedAt`   | timestamptz |                                    |
| `completedAt` | timestamptz | Nullable                           |

### IoT integration

#### `objects`

IoT object metadata — physical devices or data points from the upstream gateway.

| Column        | Type        | Notes                          |
| ------------- | ----------- | ------------------------------ |
| `id`          | uuid PK     |                                |
| `code`        | varchar     | Unique upstream identifier     |
| `name`        | varchar     | Human-readable name            |
| `type`        | varchar     | Object category                |
| `description` | text        | Optional                       |
| `metadata`    | jsonb       | Additional upstream properties |
| `createdAt`   | timestamptz |                                |

### Carbon tracking

#### `carbon_factors`

Emission factors for carbon calculations.

| Column      | Type        | Notes             |
| ----------- | ----------- | ----------------- |
| `id`        | uuid PK     |                   |
| `name`      | varchar     | Factor name       |
| `value`     | real        | kg CO₂e per unit  |
| `unit`      | varchar     | e.g. `kWh`, `m³`  |
| `category`  | varchar     | Grouping category |
| `createdAt` | timestamptz |                   |

#### `carbon_factor_nodes`

Tree-structured nodes for organizing carbon factors.

| Column      | Type    | Notes                               |
| ----------- | ------- | ----------------------------------- |
| `id`        | uuid PK |                                     |
| `parentId`  | uuid FK | → carbon_factor_nodes(id), nullable |
| `factorId`  | uuid FK | → carbon_factors(id), nullable      |
| `name`      | varchar | Node label                          |
| `sortOrder` | integer | Display order                       |

### 3D scene configuration

#### `dashboard_models`

Single-row 3D scene configuration for the web portal.

| Column                  | Type        | Notes                      |
| ----------------------- | ----------- | -------------------------- |
| `id`                    | serial PK   |                            |
| `modelFileUrl`          | varchar     | Path to the glTF/glB model |
| `cameraPreset`          | varchar     | Named camera angle         |
| `ambientLightIntensity` | real        | 0–1 ambient light level    |
| `hotspots`              | jsonb       | Array of {x,y,z,label}     |
| `labels`                | jsonb       | Array of {position,text}   |
| `updatedAt`             | timestamptz |                            |

## Adding a new table

1. Create `packages/server/src/schemas/<name>.ts` — export the `pgTable(...)` definition.
2. Re-export it from `schemas/index.ts`.
3. Run `pnpm db:generate` and review the generated SQL migration.
4. Apply it with `pnpm db:migrate` (or `pnpm db:push` in dev).
5. Add a repository module under `repositories/<name>.ts` exposing `createXxx`, `findXxx`, etc.
6. Wire routes that need it through the repository.

Never call Drizzle directly from a route — every read/write goes through the repository layer so the routes stay focused on validation and response shaping.
