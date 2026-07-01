# 快速上手

EcoCtrl 提供两种运行方式，按需选择：

| 你的目标               | 推荐路径                               |
| ---------------------- | -------------------------------------- |
| 用容器一键体验整个平台 | [Docker Compose](#docker-compose-启动) |
| 在本地修改源码并热更新 | 见 [开发指南](./development)           |

## Docker Compose 启动

一条命令把 PostgreSQL、API 服务、admin 后台、web 公共门户全部拉起来。

### 前置要求

- Docker 24+ 并启用 Compose 插件
- 空闲的 TCP 端口：`3000`（API）、`4173`（admin）、`8081`（web）、`5432`（Postgres）

### 步骤

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl/docker
cp .env.example .env.local
# 打开 .env.local，设置 JWT_SECRET（必填）以及 BASE_URL / APP_ID（IoT 网关，可选）。
docker compose -f compose.yml up --build
```

构建完成后，可通过以下地址访问：

| 服务       | URL                                 |
| ---------- | ----------------------------------- |
| Web 门户   | http://localhost:8081               |
| Admin 后台 | http://localhost:4173               |
| REST API   | http://localhost:3000               |
| Swagger UI | http://localhost:3000/documentation |

::: tip 首次登录
首次启动时会自动创建管理员账号。默认凭据为 `admin` / `pnpm db:seed` 打印的密码（或通过 `.env.local` 中的 `INITIAL_ADMIN_PASSWORD` 设置）。打开 admin 后台 http://localhost:4173 并登录。
:::

### 停止服务

```bash
docker compose -f compose.yml down          # 保留数据
docker compose -f compose.yml down -v       # 同时清空 Postgres volume
```

## 下一步

- 配置 **本地开发环境** 并启用热更新 → [开发指南](./development)。
- 了解 **Monorepo 与工具链** → [Monorepo 结构](./monorepo)。
- 浏览 **环境变量** 列表 → [环境变量](/reference/env-vars)。
