---
title: Docker 部署指南
description: 三种 Compose 文件区别、部署流程、Caddyfile 配置
---

# Docker 部署指南

EcoCtrl 以 Docker 镜像形式发布到 GitHub Container Registry (GHCR)。推荐使用 Docker Compose 部署全部服务。

## 部署方案

提供三份 Compose 文件，分别对应不同场景：

| 文件                 | 用途                                           |
| -------------------- | ---------------------------------------------- |
| `compose.yaml`       | 从 GHCR 拉取预构建镜像（默认，推荐生产使用）   |
| `compose.build.yaml` | 从本地 Dockerfile 构建所有镜像（自定义代码时） |
| `compose.dev.yaml`   | 开发叠加层，挂载本地源码并启用热重载           |

三份文件均位于 `docker/` 目录，由 `scripts/generate-compose.py` 从 `compose.base.yaml` 模板生成，**请勿直接编辑生成的 yaml 文件**。

## 前置准备

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl/docker
cp .env.example .env.local
$EDITOR .env.local    # 至少设置 JWT_SECRET（必填）
```

所有 Compose 场景都使用 `docker/.env.local` 作为共享环境变量文件。

## 场景一：预构建镜像部署（推荐）

一条命令启动全部服务：

```bash
docker compose up -d
```

服务列表：

| 服务       | 端口 | 地址                               |
| ---------- | ---- | ---------------------------------- |
| Web 门户   | 8081 | `http://<host>:8081`               |
| Admin 后台 | 4173 | `http://<host>:4173`               |
| REST API   | 3000 | `http://<host>:3000`               |
| Swagger UI | 3000 | `http://<host>:3000/documentation` |
| PostgreSQL | 5432 | 容器内部                           |
| MinIO      | 9000 | 对象存储（容器内部）               |

### 升级

```bash
docker compose pull
docker compose up -d
docker compose exec server npx drizzle-kit migrate  # 运行数据库迁移
```

## 场景二：源码构建部署

从本地源码构建镜像，适合需要自定义代码或审查构建过程：

```bash
cd docker
cp .env.example .env.local
# 编辑 .env.local 填入必要配置

# 使用串行构建脚本（推荐，避免并发构建耗尽资源）
./build.sh

# 或手动构建
# docker compose -f compose.build.yaml build
# docker compose -f compose.build.yaml up -d
```

> **注意**：并发构建多个 Node 镜像（server + web + admin）可能因内存或网络资源不足而失败。串行构建脚本 `build.sh` 每次构建一个镜像，是最可靠的方式。

## 场景三：开发调试

挂载本地源码并启用热更新，适合日常开发：

```bash
cd docker
docker compose -f compose.build.yaml -f compose.dev.yaml up --build
```

开发模式下：

- API 服务运行在端口 **3001**（避免与本地开发冲突）
- Admin 运行在端口 **5173**（Vite dev server）
- Web 运行在端口 **8080**（Vite dev server）
- 源码修改后自动重载

## Caddyfile 配置

前端 SPA 容器（admin/web）使用 Caddy 作为轻量级 Web 服务器和反向代理。每个容器的 `Caddyfile` 内容相同：

```caddyfile
:80 {
    handle_path /api/* {
        rewrite * {$API_PREFIX:/api}{uri}
        reverse_proxy {$API_BASE_URL:http://localhost:3000}
    }

    handle_path /static/* {
        rewrite * {$STATIC_PREFIX:/static}{uri}
        reverse_proxy {$API_BASE_URL:http://localhost:3000}
    }

    handle {
        root * /usr/share/caddy
        try_files {path} /index.html
        file_server
    }

    encode gzip zstd

    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2 *.ttf *.eot *.otf *.webp
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
}
```

关键规则：

| 规则             | 说明                                                           |
| ---------------- | -------------------------------------------------------------- |
| `/api/*` 代理    | 将所有 `/api` 请求转发到后端服务器端口                         |
| `/static/*` 代理 | 将静态资源请求（3D 模型等）转发到后端                          |
| SPA fallback     | `try_files {path} /index.html` 确保客户端路由正常工作          |
| 静态资源缓存     | 前端 bundle 的 JS/CSS/字体文件设置一年强缓存                   |
| 安全响应头       | `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` |

## 环境文件配置

部署时通过 `docker/.env.local` 统一配置所有环境变量。

```bash
cp .env.example .env.local
```

关键变量（完整参考见[环境变量参考](/deployment/env-vars)）：

| 变量                      | 说明                   | 必填 |
| ------------------------- | ---------------------- | ---- |
| `JWT_SECRET`              | JWT 签名密钥           | 是   |
| `DATABASE_URL`            | 外部数据库连接（可选） | 否   |
| `INIT_ADMIN_PASSWORD`     | 初始管理员密码         | 否   |
| `CORS_ORIGIN`             | 允许的跨域来源         | 否   |
| `SMTP_HOST` / `SMTP_PASS` | 邮件服务器             | 否   |

> `DATABASE_URL` 留空时使用 Compose 内置的 PostgreSQL。

## 默认管理员账号

首次启动时，服务端会自动创建初始管理员账号：

| 字段   | 默认值                                                                |
| ------ | --------------------------------------------------------------------- |
| 用户名 | `admin`                                                               |
| 密码   | 由 `INIT_ADMIN_PASSWORD` 指定，未设置则**随机生成**并输出到服务端日志 |
| 邮箱   | `admin@example.com`                                                   |

> **生产环境务必设置 `INIT_ADMIN_PASSWORD` 为一个强密码**，或启动后立即在 Admin 后台修改。如果不设置，请查看 `docker compose logs server` 获取随机生成的管理员密码。

## 停止服务

```bash
docker compose down          # 保留数据卷
docker compose down -v       # 同时清空 PostgreSQL 和 MinIO 数据卷（危险！将丢失所有数据）
```

## TLS 与 HTTPS

Compose 配置的是**明文 HTTP**。生产环境请在容器之外终结 TLS，可选方案：

- **反向代理**（推荐）：使用 Caddy、Nginx、Traefik 等在前置层提供 HTTPS
- **云平台负载均衡**：AWS ALB、Cloudflare、阿里云 SLB 等在入口层终结 TLS
- **修改 Caddyfile**：直接在每个 SPA 容器中配置 Caddy 自动 HTTPS（需要修改 Dockerfile）

### 前置反向代理示例（Nginx）

```nginx
server {
    listen 443 ssl;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 离线部署

如果目标机器无法访问外部仓库：

1. 在有网络的机器上下载离线部署包
2. 传输到目标机器

```bash
unzip ecoctrl.zip
cd ecoctrl-docker
sh migrate-images.sh compose.yaml --load ecoctrl-images.tar
docker compose up -d
```

离线包内已包含：

- 预拉取的所有 Docker 镜像（含 PostgreSQL、MinIO、Server、Web、Admin）
- `compose.yaml` 与加载脚本
- 无需连接外部仓库

## 健康检查

每个容器都配置了健康检查：

| 容器     | 检查方式                                       | 间隔 |
| -------- | ---------------------------------------------- | ---- |
| postgres | `pg_isready -U ecoctrl -d ecoctrl`             | 5s   |
| minio    | `curl http://localhost:9000/minio/health/live` | 5s   |
| server   | `wget -qO- http://127.0.0.1:3000/health`       | 10s  |

`depends_on` 配合 `condition: service_healthy` 确保服务按正确顺序启动。
