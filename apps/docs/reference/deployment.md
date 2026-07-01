# 部署指南

EcoCtrl 以 Docker 镜像形式发布到 GHCR。生产环境推荐使用 Docker Compose 部署。

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
