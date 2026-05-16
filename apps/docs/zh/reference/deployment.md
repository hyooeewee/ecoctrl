# 部署指南

EcoCtrl 支持两种生产部署形态：

| 形态                                  | 适用场景                    | 依赖                      |
| ------------------------------------- | --------------------------- | ------------------------- |
| [Docker Compose](#docker-compose)     | 单机部署、私有部署          | Docker 24+                |
| [预构建 release zip](#预构建-release) | 不使用 Docker 的 Linux 主机 | Node 20+、PostgreSQL、pm2 |

## Docker Compose

提供了三份 Compose 文件，分别对应不同场景：

| 文件                 | 用途                                 |
| -------------------- | ------------------------------------ |
| `compose.yml`        | 从 GHCR 拉取预构建镜像（默认）       |
| `compose.build.yaml` | 从本地 Dockerfile 构建所有镜像       |
| `compose.dev.yaml`   | 开发叠加层，挂载本地源码并启用热更新 |

### 预构建镜像部署（默认）

一条命令把 PostgreSQL、API 服务、admin 后台、web 公共门户全部拉起来。

### 一次性配置

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl/docker
cp .env.example .env.local
$EDITOR .env.local        # 设置 JWT_SECRET（必填）以及 IoT 凭据（可选）
```

:::tabs
== 在线部署（默认）

目标机器可以访问 GHCR 和 Docker Hub，直接执行下方的 `docker compose` 命令即可。

== 离线部署（无外网）

如果目标机器无法访问外部仓库，可 <a href="https://bucket.godot.qzz.io/images/latest/ecoctrl.zip" download>下载离线部署包</a> 后执行：

```bash
unzip ecoctrl.zip
cd ecoctrl-docker
sh migrate-images.sh compose.yaml --load ecoctrl-images.tar
docker compose up -d
```

包内已包含预拉取的镜像（含 PostgreSQL）、`compose.yaml` 与加载脚本，无需连接外部仓库。
:::

### 运行

```bash
docker compose -f compose.yml up --build
```

服务列表：

| 服务       | 端口 | 地址                               |
| ---------- | ---- | ---------------------------------- |
| Web 门户   | 8081 | `http://<host>:8081`               |
| Admin 后台 | 4173 | `http://<host>:4173`               |
| REST API   | 3000 | `http://<host>:3000`               |
| Swagger UI | 3000 | `http://<host>:3000/documentation` |
| PostgreSQL | 5432 | 容器内部                           |

### 自定义

- **后端主机**：编辑 `apps/admin/.env.local` 与 `apps/web/.env.local`，让 `API_BASE_URL` 指向真实后端（或 compose 内的服务名）。
- **数据库凭据**：在 `compose.yml` 中修改 `POSTGRES_USER/PASSWORD/DB`，并同步更新 `DATABASE_URL`。
- **CORS**：在服务端环境中设置 `CORS_ORIGIN=https://app.example.com,https://admin.example.com`。

### 停止

```bash
docker compose -f compose.yml down          # 保留数据
docker compose -f compose.yml down -v       # 同时清空 Postgres volume
```

::: warning
`compose.yml` 配置的是明文 HTTP。生产环境请在容器之外终结 TLS（主机上的 Caddy、Cloudflare、ALB 等），再把流量转发到 SPA 容器。
:::

## 预构建 Release

GitHub Releases 为每个 tag 发布预构建 zip。其中包含 SPA bundle 与 Rolldown 打包好的服务端，附带自动生成的 `dist/package.json`，仅列出运行时依赖 — 用 `pnpm install --prod` 即可安装。

### 下载

:::tabs
== GitHub Releases

打开 [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases)：

- **`ecoctrl-vX.Y.Z.zip`** — 推荐，包含全部组件，可直接配合 `start.mjs` 使用。
- 单包：`admin-vX.Y.Z.zip`、`web-vX.Y.Z.zip`、`server-vX.Y.Z.zip`，并排解压到同一目录即可。

== 国内镜像

如果 GitHub Releases 访问较慢，可从 Cloudflare R2 镜像下载（每次 release 自动同步）：

- **完整包**：<a href="https://bucket.godot.qzz.io/releases/latest/ecoctrl.zip" download>ecoctrl.zip ↓</a>
- **Admin**：<a href="https://bucket.godot.qzz.io/releases/latest/admin.zip" download>admin.zip ↓</a>
- **Web**：<a href="https://bucket.godot.qzz.io/releases/latest/web.zip" download>web.zip ↓</a>
- **Server**：<a href="https://bucket.godot.qzz.io/releases/latest/server.zip" download>server.zip ↓</a>

:::

### 解压结构

```
ecoctrl/
├── start.mjs
├── server/
│   ├── index.mjs
│   ├── package.json
│   ├── ecoctrl.config.cjs   # 服务端的 pm2 配置
│   └── .env.example         # 复制为 .env.local
├── admin/                   # 静态产物
└── web/                     # 静态产物
```

### 配置

```bash
cd ecoctrl
cp server/.env.example server/.env.local
$EDITOR server/.env.local       # DATABASE_URL、JWT_SECRET，以及可选的 IoT/OAuth/SMTP

# 可选：覆盖各 App 的代理目标，如果 API 不在 http://localhost:3000
echo 'API_BASE_URL=https://api.example.com' > admin/.env.local
echo 'API_BASE_URL=https://api.example.com' > web/.env.local
```

### 启动

```bash
node start.mjs
```

`start.mjs` 会执行：

1. 第一次启动时在 `server/` 中运行 `pnpm install --prod`。
2. 通过 pm2 启动 API（进程名 `ecoctrl-server`）。
3. 用 [`local-web-server`](https://github.com/lwsjs/local-web-server) 把 `admin/` 起在 `:4173`、`web/` 起在 `:8081`，附带 `--rewrite "/api/(.*) -> $API_BASE_URL$API_PREFIX/$1"`。

再次执行脚本会进入交互菜单（`[r]` 重启、`[s]` 停止、`[q]` 取消）。

### 手动停止

```bash
npx pm2 delete ecoctrl-server
kill "$(cat logs/admin.pid)"
kill "$(cat logs/web.pid)"
```

### 在前面挂反向代理

SPA 服务与 API 都监听明文 HTTP。生产环境通常配合一个负责 TLS 终结的反向代理。Caddy 示例：

```nginx
app.example.com {
    reverse_proxy localhost:8081      # web 门户
}

admin.example.com {
    reverse_proxy localhost:4173      # admin
}

api.example.com {
    reverse_proxy localhost:3000      # API 服务
}
```

然后在 `admin/.env.local` 与 `web/.env.local` 中设置 `API_BASE_URL=https://api.example.com`。SPA 不需要重新构建。

## 从源码构建

如果你想自行构建，而不使用 release zip：

```bash
pnpm install
pnpm build:admin    # → apps/admin/dist/
pnpm build:web      # → apps/web/build/
pnpm build:server   # → packages/server/dist/{index.mjs, package.json}
```

服务端构建产物的 `dist/package.json` 仅列出 bundle 实际用到的依赖，所以 `server/` 加上 `pnpm install --prod` 就能跑。

## 上线 Checklist

把 EcoCtrl 暴露到公网之前，请确认：

```markdown
- [ ] 设置一个强随机的 `JWT_SECRET`，并替换掉所有默认值。
- [ ] 将 `CORS_ORIGIN` 限制到真实域名。
- [ ] 使用托管 PostgreSQL（或自建并加固 — TLS、备份、监控）。
- [ ] 在代理层为 `admin.*`、`app.*`、`api.*` 启用 HTTPS。
- [ ] 配置 SMTP — 否则注册和密码重置验证码会静默失败。
- [ ] 如使用 OAuth，将生产回调地址登记到各 Provider。
- [ ] 安排数据库备份（平台中的 `backup_schedules` 仅记录下一次时间，真正的备份执行仍需自行实现）。
- [ ] 在生产中收紧数据库角色权限：撤销 `CREATE DATABASE`，让自动建库逻辑只在开发环境生效。
- [ ] 把服务端日志接入聚合系统（Fastify 使用 pino 生成 JSON-on-stdout，可与各种日志方案对接）。
```
