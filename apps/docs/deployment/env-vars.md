---
title: 环境变量参考
description: 完整变量表（JWT、数据库、AI、SMTP、OAuth、S3、日志、IoT 等）
---

# 环境变量参考

环境变量通过 `docker/.env.local` 配置。所有变量均由服务端的 Zod schema 校验（`packages/server/src/lib/env.ts`），仅有明确定义的变量才会被读取并生效。

<!-- 完整变量表，见各分类小节 -->

## 核心服务

| 变量           | 默认值        | 必填   | 说明                                                                  |
| -------------- | ------------- | ------ | --------------------------------------------------------------------- |
| `NODE_ENV`     | `development` | 否     | 运行模式 `production` / `development`                                 |
| `PORT`         | `3000`        | 否     | 服务端 HTTP 监听端口                                                  |
| `HOST`         | `0.0.0.0`     | 否     | 服务端监听地址                                                        |
| `JWT_SECRET`   | —             | **是** | JWT 签名密钥，生产环境需设置为强随机字符串                            |
| `CORS_ORIGIN`  | —             | 否     | 允许跨域来源，多个用逗号分隔。生产环境必须限制为真实域名              |
| `DATABASE_URL` | —             | **是** | PostgreSQL 连接字符串，格式 `postgresql://user:password@host:5432/db` |

## 认证与初始管理员

| 变量                     | 默认值              | 必填 | 说明                                                                                                     |
| ------------------------ | ------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `INITIAL_ADMIN_PASSWORD` | —                   | 否   | 首次启动时创建的超级管理员密码。未设置则随机生成并输出到日志                                             |
| `INIT_ADMIN_USERNAME`    | `admin`             | 否   | DEPRECATED — 与 `INITIAL_ADMIN_PASSWORD` 冲突时以 `INITIAL_ADMIN_PASSWORD` 为准（Docker Compose 中使用） |
| `INIT_ADMIN_EMAIL`       | `admin@example.com` | 否   | 初始管理员邮箱                                                                                           |

## 日志

| 变量                  | 默认值   | 必填 | 说明                                         |
| --------------------- | -------- | ---- | -------------------------------------------- |
| `LOG_LEVEL`           | `info`   | 否   | 日志级别 `debug` / `info` / `warn` / `error` |
| `LOG_DESTINATION`     | `stdout` | 否   | 输出目标 `stdout` / `file` / `both`          |
| `LOG_DIR`             | `./logs` | 否   | 日志文件目录（`file` 或 `both` 时有效）      |
| `LOG_PRETTY`          | `true`   | 否   | 是否使用美化输出（仅开发模式有效）           |
| `LOG_ROTATE_INTERVAL` | `1d`     | 否   | 日志轮转间隔（`1d` / `7d` / `1h`）           |
| `LOG_MAX_DAYS`        | `30`     | 否   | 日志保留天数                                 |

## AI 服务

| 变量          | 默认值                                   | 必填                     | 说明                                              |
| ------------- | ---------------------------------------- | ------------------------ | ------------------------------------------------- |
| `AI_PROVIDER` | `openai`                                 | 否                       | AI 提供商，`anthropic` / `openai`                 |
| `AI_API_KEY`  | —                                        | **是**（使用 AI 功能时） | API 密钥                                          |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1`           | 否                       | 自定义 API 端点，可切换为兼容 OpenAI 的第三方服务 |
| `AI_MODEL`    | `nvidia/nemotron-3-super-120b-a12b:free` | 否                       | 模型标识符                                        |

> AI 功能为可选。未配置时，AI 助手功能在前端自动隐藏。

## SMTP 邮件服务

| 变量          | 默认值         | 必填 | 说明                                 |
| ------------- | -------------- | ---- | ------------------------------------ |
| `SMTP_HOST`   | `smtp.163.com` | 否   | SMTP 服务器地址                      |
| `SMTP_PORT`   | `465`          | 否   | SMTP 端口（SSL: 465，TLS: 587）      |
| `SMTP_USER`   | —              | 否   | SMTP 用户名                          |
| `SMTP_PASS`   | —              | 否   | SMTP 密码或授权码                    |
| `SMTP_SECURE` | `true`         | 否   | 是否使用 SSL 连接 (`true` / `false`) |

> 详情见 [SMTP 邮件服务配置](/deployment/smtp)。

## OAuth 登录

| 变量                | 默认值 | 必填 | 说明                   |
| ------------------- | ------ | ---- | ---------------------- |
| `WECHAT_APP_ID`     | —      | 否   | 微信开放平台 AppID     |
| `WECHAT_APP_SECRET` | —      | 否   | 微信开放平台 AppSecret |
| `FEISHU_APP_ID`     | —      | 否   | 飞书开放平台 AppID     |
| `FEISHU_APP_SECRET` | —      | 否   | 飞书开放平台 AppSecret |

> OAuth 功能可选。未配置时，登录界面对应的 OAuth 按钮自动隐藏。

## 天气服务

| 变量                  | 默认值     | 必填 | 说明                                                  |
| --------------------- | ---------- | ---- | ----------------------------------------------------- |
| `OPENWEATHER_API_KEY` | —          | 否   | [OpenWeather](https://openweathermap.org/api) API Key |
| `WEATHER_LAT`         | `39.9042`  | 否   | 默认纬度（北京）                                      |
| `WEATHER_LNG`         | `116.4074` | 否   | 默认经度（北京）                                      |
| `WEATHER_LOCATION`    | `Beijing`  | 否   | 显示的地点名称                                        |

> 天气功能可选。未配置时，仪表盘天气组件自动隐藏。

## IoT 集成

| 变量       | 默认值 | 必填 | 说明                                           |
| ---------- | ------ | ---- | ---------------------------------------------- |
| `BASE_URL` | —      | 否   | IoT 网关基础 URL（BACnet 网关/第三方网关地址） |
| `APP_ID`   | —      | 否   | IoT 应用 ID（用于自动刷新 IoT 令牌）           |

> IoT 集成功能可选。未配置时，照明控制等功能会降级到 Mock 模式运行。

## 对象存储 (S3)

| 变量                  | 默认值           | 必填 | 说明                                                   |
| --------------------- | ---------------- | ---- | ------------------------------------------------------ |
| `STORAGE_PROVIDER`    | `local`          | 否   | 存储后端 `minio` / `local`（local 仅用于开发）         |
| `S3_ENDPOINT`         | —                | 否   | S3 兼容端点地址                                        |
| `S3_REGION`           | `us-east-1`      | 否   | S3 区域                                                |
| `S3_ACCESS_KEY`       | —                | 否   | S3 访问密钥                                            |
| `S3_SECRET_KEY`       | —                | 否   | S3 秘密密钥                                            |
| `S3_BUCKET_FILES`     | `ecoctrl-files`  | 否   | 文件附件存储桶                                         |
| `S3_BUCKET_MODELS`    | `ecoctrl-models` | 否   | 3D 模型存储桶                                          |
| `S3_BUCKET_NODES`     | `ecoctrl-nodes`  | 否   | 工作流节点插件存储桶（代码中旧名 `S3_BUCKET_PLUGINS`） |
| `S3_BUCKET_PETS`      | `ecoctrl-pets`   | 否   | AI 宠物插件存储桶                                      |
| `S3_FORCE_PATH_STYLE` | `false`          | 否   | 是否强制使用路径风格（MinIO 需设为 `true`）            |
| `S3_PUBLIC_ENDPOINT`  | —                | 否   | 公开访问的 S3 端点（若需要客户端直连）                 |

> `STORAGE_PROVIDER=local` 将文件存储在本地磁盘的 `uploads/` 目录。`minio` 模式需要运行 MinIO 容器并配置 S3 环境变量。

## Docker Compose 配置

以下变量仅用于 Docker Compose 部署配置，不会被服务端代码直接读取：

| 变量                 | 默认值    | 说明                 |
| -------------------- | --------- | -------------------- |
| `POSTGRES_USER`      | `ecoctrl` | PostgreSQL 用户名    |
| `POSTGRES_PASSWORD`  | —         | PostgreSQL 密码      |
| `POSTGRES_DB`        | `ecoctrl` | PostgreSQL 数据库名  |
| `POSTGRES_PORT`      | `5432`    | PostgreSQL 端口      |
| `MINIO_ACCESS_KEY`   | `ecoctrl` | MinIO 访问密钥       |
| `MINIO_SECRET_KEY`   | —         | MinIO 秘密密钥       |
| `MINIO_API_PORT`     | `9000`    | MinIO API 端口       |
| `MINIO_CONSOLE_PORT` | `9001`    | MinIO 管理控制台端口 |
| `SERVER_PORT`        | `3000`    | 服务端端口映射       |
| `SERVER_HOST`        | `0.0.0.0` | 服务端监听地址       |
| `WEB_PORT`           | `8081`    | Web 门户端口映射     |
| `ADMIN_PORT`         | `4173`    | Admin 后台端口映射   |
| `API_PREFIX`         | `/api`    | API 路径前缀         |
| `STATIC_PREFIX`      | `/static` | 静态资源路径前缀     |

## Docker Compose 环境变量传递架构

```
.env.example
    ↓ (复制)
.env.local  ← 运维编辑此文件
    │
    ├── compose.yaml 读取 → 容器环境变量
    │       │
    │       ├── postgres: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    │       ├── minio:    MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
    │       ├── server:   DATABASE_URL, JWT_SECRET, AI_* ... (通过 env_file 加载 .env.local)
    │       │              + 直接定义的环境变量（S3_*、INIT_ADMIN_*）
    │       ├── web:      API_BASE_URL, API_PREFIX, STATIC_PREFIX
    │       └── admin:    API_BASE_URL, API_PREFIX, STATIC_PREFIX
    └── packages/server/.env.local (通过挂载卷只读提供给 server 容器)
```

> **注意**：服务端会通过 `dotenv` 加载 `packages/server/.env.local` 文件，但主配置来源是 `compose.yaml` 中的 `env_file: .env.local`。重复定义时，容器的环境变量优先级更高。

## 配置验证

在 Admin 后台的 **系统配置** 页面可以查看已加载的配置状态（部分变量不会暴露到前端）。服务端启动时如果缺少必填变量（如 `JWT_SECRET`），将立即抛出错误并退出。
