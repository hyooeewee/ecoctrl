# 环境变量

每个 EcoCtrl 进程都从源码同目录的 `.env.local` 读取配置。`.env.local` 始终高于 `.env.example`，后者作为模板与缺省回落值。

## 服务端（`packages/server/.env.local`）

由 `packages/server/index.ts` 顶部的 `dotenv` 加载。

### 核心

| 变量           | 必填 | 默认值      | 说明                                                                                                                                                       |
| -------------- | ---- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | 是   | —           | PostgreSQL 连接串，例如 `postgresql://ecoctrl:ecoctrl_secret@localhost:5432/ecoctrl`。如果角色拥有相应权限，服务端首次启动时会自动尝试 `CREATE DATABASE`。 |
| `JWT_SECRET`   | 是   | —           | 用于签发 Access Token。修改后所有已签发 Token 立即失效。                                                                                                   |
| `PORT`         | 否   | `3000`      | 监听端口。                                                                                                                                                 |
| `HOST`         | 否   | `0.0.0.0`   | 监听地址。                                                                                                                                                 |
| `CORS_ORIGIN`  | 否   | reflect any | 逗号分隔的白名单（例如 `https://app.example.com,https://admin.example.com`）。未设置时直接反射请求 Origin。                                                |

### 邮件（验证码）

平台把 SMTP 凭据保存在 `platform_configs` 表的单行记录里；启动时 `syncSmtpFromEnv()` 会用环境变量覆盖该行。设置一次即可生效。

| 变量          | 说明                                                   |
| ------------- | ------------------------------------------------------ |
| `SMTP_HOST`   | SMTP 中继主机。                                        |
| `SMTP_PORT`   | SMTP 端口（默认 `587`）。                              |
| `SMTP_USER`   | SMTP 用户名。                                          |
| `SMTP_PASS`   | SMTP 密码或应用专用密码。                              |
| `SMTP_SECURE` | `true` 表示 SMTPS（端口 465），`false` 表示 STARTTLS。 |

### IoT 网关代理（可选）

| 变量       | 说明                                       |
| ---------- | ------------------------------------------ |
| `BASE_URL` | 上游 IoT 网关地址。                        |
| `APP_ID`   | 上游网关在 token 刷新流程中使用的应用 ID。 |

### 天气挂件（可选）

| 变量                  | 默认值     | 说明                                                   |
| --------------------- | ---------- | ------------------------------------------------------ |
| `OPENWEATHER_API_KEY` | —          | OpenWeatherMap API key。为空时仪表盘的天气卡片不展示。 |
| `WEATHER_LAT`         | `39.9042`  | 默认纬度。                                             |
| `WEATHER_LNG`         | `116.4074` | 默认经度。                                             |
| `WEATHER_LOCATION`    | `Beijing`  | 显示名。                                               |

### OAuth Provider（可选）

`GET /api/auth/oauth/providers` 会返回已配置的 Provider；该接口为空时管理后台不会渲染 OAuth 按钮。

| 变量                            | 说明           |
| ------------------------------- | -------------- |
| `WECHAT_APPID`、`WECHAT_SECRET` | 启用微信登录。 |
| `FEISHU_APPID`、`FEISHU_SECRET` | 启用飞书登录。 |

## Admin 与 Web（`apps/{admin,web}/.env.local`）

这些变量 **由运行时层读取（Docker 中是 Caddy，release zip 中是 lws），并不会被 JavaScript bundle 读取**。客户端代码总是请求字面量 `/api` 与 `/static` 前缀。

| 变量            | 默认值                  | 说明                                                                    |
| --------------- | ----------------------- | ----------------------------------------------------------------------- |
| `API_BASE_URL`  | `http://localhost:3000` | 上游 API 地址。在 Docker compose 内使用服务名（`http://server:3000`）。 |
| `API_PREFIX`    | `/api`                  | 上游处理 JSON 请求的路径前缀。                                          |
| `STATIC_PREFIX` | `/static`               | 上游提供静态文件（3D 模型）的路径前缀。                                 |

::: tip 为什么这里没有 `VITE_*` 变量？
把 API 主机塞进 bundle 意味着每次部署目标变化都要重新构建。EcoCtrl 选择把 API 主机完全隔离在 bundle 之外，仅由代理层感知。具体实现见 [架构总览 — 运行时拓扑](/zh/reference/architecture#运行时拓扑)。
:::

## Docker Compose（`docker/.env.local`）

`docker/compose.yml` 会把以下变量插值到 `server` 服务的环境中：

| 变量         | 说明                              |
| ------------ | --------------------------------- |
| `JWT_SECRET` | 必填。挂载到服务端容器。          |
| `BASE_URL`   | 可选。转发到服务端的 `BASE_URL`。 |
| `APP_ID`     | 可选。转发到服务端的 `APP_ID`。   |

数据库凭据、端口与 `DATABASE_URL` 都直接写死在 `compose.yml` 里，开箱即用。如需修改，请编辑 compose 文件。

## 优先级顺序

同一变量在多个位置出现时，EcoCtrl 按以下顺序解析（高优先级在前）：

1. **Shell 环境变量** — `JWT_SECRET=... ./start.sh`。
2. **每个 App 的 `.env.local`** — `apps/admin/.env.local`、`apps/web/.env.local`、`packages/server/.env.local`。
3. **每个 App 的 `.env.example`** — 仅作为兜底/测试用。
4. **`start.sh` 与服务端中的内置默认值**。

release zip 的 `start.sh` 还支持把 `ROOT/.env.local` 作为 admin 与 web 共享的兜底配置 — 当两个 App 指向同一后端时非常方便。
