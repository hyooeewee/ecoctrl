# 数据库 Schema

EcoCtrl 把所有数据保存在一个 PostgreSQL 数据库中。Schema 使用 [Drizzle ORM](https://orm.drizzle.team/) 在 `packages/server/src/schemas/` 下定义，每张表一个文件。

## 工作流

| 命令 | 作用 |
|---|---|
| `pnpm db:generate` | 对比当前 schema 与上一版本，生成新的迁移到 `packages/server/drizzle/`。 |
| `pnpm db:migrate` | 应用待执行迁移。 |
| `pnpm db:push` | 直接推送当前 schema（开发期捷径，不保留迁移历史）。 |
| `pnpm db:seed` | 写入示例用户、看板、能耗数据。 |
| `pnpm db:refresh` | drop → push → seed → 打开 Drizzle Studio。**破坏性命令**。 |
| `pnpm db:studio` | 在配置好的数据库上打开 Drizzle Studio。 |

每个 schema 都从 `schemas/index.ts` 重新导出，新增表只需添加一次即可。

## 表清单

### 身份与会话

#### `users`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK | 服务端生成。 |
| `username` | varchar(255) | 通常唯一 — 同时作为登录标识符。 |
| `password` | varchar(255) | bcrypt 哈希；纯 OAuth 账号可为空。 |
| `email` | varchar(255) | 必填，用于发送验证码。 |
| `role` | varchar(100) | 默认是 `USER_ROLE_LIST` 中最低的角色。 |
| `status` | varchar(20) | `online` / `offline`。 |
| `lastLogin` | varchar(50) | 时间戳字符串。 |
| `avatarUrl` | varchar(500) | 可空。 |
| `preferences` | jsonb | UI 偏好。 |
| `createdAt` | timestamptz | `defaultNow()`。 |

#### `oauth_accounts`

把 `users.id` 与外部 Provider（微信、飞书）关联。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users(id) | `ON DELETE CASCADE`。 |
| `provider` | varchar(50) | `wechat`、`feishu`。 |
| `providerUserId` | varchar(255) | Provider 的稳定用户 ID。 |
| `providerEmail` | varchar(255) | 可选。 |
| `accessToken` | varchar(1000) | Provider 颁发。 |
| `refreshToken` | varchar(1000) | Provider 颁发。 |
| `expiresAt` | timestamptz | Provider 给定的过期时间。 |

#### `refresh_tokens`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users(id) | `ON DELETE CASCADE`。 |
| `tokenHash` | varchar(255) | 已签发 Refresh Token 的 sha256。 |
| `expiresAt` | timestamptz | 自签发起 7 天。 |
| `createdAt` | timestamptz | |

每次成功登录都会先删除该用户已有的 Refresh Token，再写入新记录 — 这就是单设备会话的机制。

#### `user_settings`

每个用户的看板布局偏好，整张表以 `userId` 为主键，配置以 jsonb 存储。

### IoT 集成

#### `iot_tokens`

为上游 IoT 网关缓存的单行 token。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | serial PK | |
| `accessToken` | text | |
| `refreshToken` | text | |
| `expiresAt` | bigint | 绝对过期时间，毫秒时间戳。 |

### 业务运行数据

#### `alerts`

实时事件流，展示在仪表盘上。字段：`id`、`device`、`level`、`message`、`time`、`status`（`pending` / 已确认）。

#### `faults`

持久化故障记录。字段：`id`、`device`、`level`、`time`、`status`、`createdAt`。

#### `fault_stats`

故障指标的单行快照：`totalCount`、`trend`、`mttr`、`avgResponseTime`、`snapshotAt`。

#### `maintenance_reminders`

维护任务队列。字段：`id`、`task`、`description`、`dueDate`、`priority`、`status`、`assignee`、`location`、`estimatedHours`、`lastCompleted`。

#### `energy_readings`

每小时 kWh 读数。字段：`id`、`hour`（如 `09:00` 的字符串标签）、`kWh`（real）、`readingAt`。

#### `energy_areas`

按区域汇总的能源卡片。字段：`id`、`title`、`current`、`target`、`color`、`powerFactor`、`loadRate`。

### 仪表盘配置

#### `dashboard_stats`

管理后台仪表盘的 KPI 卡片。字段：`id`、`key`、`value`、`unit`、`trend`、`trendType`、`snapshotAt`。

#### `dashboard_widgets`

可拖拽布局的挂件网格。包含布局尺寸（`layoutX/Y/W/H`）、`dataType`、自由格式的 `dataJson`、`enabled`、`hidden`、`sortOrder`。

#### `three_d_configs`

被 `apps/web` Babylon 场景消费的 3D 场景配置。保存 `cameraPreset`、`ambientLightIntensity`、热点与标签的 JSON 数组。

### 报表与备份

#### `report_plans`、`report_templates`

定时报表任务及其模板。

#### `backup_schedules`

仅有一行：保存 `nextBackup`（时间戳字符串）。

### 平台与文件

#### `platform_configs`

单行全局配置：平台名称、刷新频率、告警开关、时区、备份保留天数、会话超时与 SMTP 凭据。每次启动 `syncSmtpFromEnv()` 都会用环境变量更新这一行。

#### `models`

上传的 3D 模型元数据。`fileUrl` 指向 `/static/models/<filename>`。

#### `files`

通用上传元数据：name、mime、size、fileUrl。

## 新增一张表

1. 创建 `packages/server/src/schemas/<name>.ts`，导出 `pgTable(...)` 定义。
2. 在 `schemas/index.ts` 中重新导出。
3. 运行 `pnpm db:generate` 并审阅生成的 SQL 迁移。
4. 通过 `pnpm db:migrate` 应用迁移（开发期可用 `pnpm db:push`）。
5. 在 `repositories/<name>.ts` 中新增 repository 模块，暴露 `createXxx`、`findXxx` 等函数。
6. 把需要使用它的路由通过 repository 接入。

切勿在路由层直接调用 Drizzle，所有读写都通过 repository 完成，保持路由聚焦在校验与响应整形。
