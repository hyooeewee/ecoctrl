# 快速上手

EcoCtrl 提供三种运行方式，按需选择：

| 你的目标                  | 推荐路径                                 |
| ------------------------- | ---------------------------------------- |
| 用容器一键体验整个平台    | [Docker Compose](#docker-compose-启动)   |
| 从 release 产物部署到生产 | [预构建 Release](#从预构建-release-启动) |
| 在本地修改源码并热更新    | 见 [开发指南](./development)             |

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
首次启动时会自动初始化管理员账号。打开 admin 后台注册或登录即可开始体验。
:::

### 停止服务

```bash
docker compose -f compose.yml down          # 保留数据
docker compose -f compose.yml down -v       # 同时清空 Postgres volume
```

## 从预构建 Release 启动

GitHub 上每个标签版本都会发布预构建产物，可直接部署到任意 Linux 主机（要求 Node.js 20+ 与 PostgreSQL）。

### 下载

打开 [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases)，选择以下任一种：

- **`ecoctrl-all-vX.Y.Z.zip`** — 推荐，已包含全部组件。
- 单独的 zip：`admin-vX.Y.Z.zip`、`web-vX.Y.Z.zip`、`server-vX.Y.Z.zip`。解压后并排放在同一个 `ecoctrl/` 目录下。

### 解压后的目录

```
ecoctrl/
├── start.sh        # 一键启动脚本
├── admin/          # admin 静态资源（端口 4173）
├── web/            # web 静态资源（端口 8081）
└── server/         # node API 包（端口 3000）
```

### 配置并启动

```bash
cd ecoctrl

# 1. 配置服务端。.env.local 优先级高于 .env.example。
cp server/.env.example server/.env.local
# 设置 DATABASE_URL、JWT_SECRET 以及可选的集成凭据。

# 2. 启动整个栈。
./start.sh
```

`start.sh` 会执行：

1. 第一次运行时为服务端安装运行时依赖（`pnpm install --prod`）。
2. 通过 [pm2](https://pm2.keymetrics.io/) 以 `ecoctrl-server` 进程名启动 API。
3. 把 `admin/` 和 `web/` 静态资源分别在 `4173` 与 `8081` 端口起服务，自动把 `/api/*` 与 `/static/*` 重写到 API。

可以随时再次运行 `./start.sh` 触发交互菜单（`[r]` 重启，`[s]` 停止，`[q]` 取消）。

### 手动停止

如需绕过菜单：

```bash
npx pm2 delete ecoctrl-server
kill "$(cat logs/admin.pid)"
kill "$(cat logs/web.pid)"
```

## 下一步

- 配置 **本地开发环境** 并启用热更新 → [开发指南](./development)。
- 了解 **Monorepo 与工具链** → [Monorepo 结构](./monorepo)。
- 浏览 **环境变量** 列表 → [环境变量](/zh/reference/env-vars)。
