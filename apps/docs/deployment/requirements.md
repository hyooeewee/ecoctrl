---
title: 系统要求与前提条件
description: Docker、Node.js、pnpm、PostgreSQL 版本与端口要求
---

# 系统要求与前提条件

本文介绍部署 EcoCtrl 所需的软件版本、端口分配和最低系统资源建议。

## 软件版本要求

| 组件       | 最低版本 | 说明                                      |
| ---------- | -------- | ----------------------------------------- |
| Docker     | 24.0+    | 生产部署推荐 Docker Compose v2            |
| Node.js    | 24.x     | 源码构建部署时需要                        |
| pnpm       | 10.33.1+ | 源码构建时需要（corepack 可自动管理版本） |
| PostgreSQL | 16.x     | 生产环境推荐使用托管数据库                |

### 验证安装

```bash
docker --version          # Docker 24.0+
node --version            # Node.js 24.x
pnpm --version            # pnpm 10.33.1+
psql --version            # PostgreSQL 16.x
```

## 端口分配

以下端口在部署主机上必须可用：

| 端口 | 服务         | 说明                                |
| ---- | ------------ | ----------------------------------- |
| 3000 | REST API     | Fastify 服务端（Swagger UI 同端口） |
| 4173 | Admin 后台   | 管理面板 SPA（Caddy 代理）          |
| 8081 | Web 门户     | 公共 3D 驾驶舱 SPA（Caddy 代理）    |
| 5432 | PostgreSQL   | 数据库（仅容器内部暴露）            |
| 9000 | MinIO API    | 对象存储 API 端口                   |
| 9001 | MinIO 控制台 | 对象存储管理控制台                  |

> 使用 `docker compose -f compose.yaml up` 启动后，如需调整端口映射，请编辑 `docker/.env.local` 中的 `SERVER_PORT`、`WEB_PORT`、`ADMIN_PORT` 等变量。

## 网络访问

生产环境需要以下出站连接：

| 目标                         | 用途                        |
| ---------------------------- | --------------------------- |
| `ghcr.io`                    | 拉取预构建 Docker 镜像      |
| `hub.docker.com`             | 拉取 PostgreSQL、MinIO 镜像 |
| `api.openweathermap.org`     | 天气数据（选用时）          |
| `api.openai.com` / 自定义 AI | AI 助手（选用时）           |
| SMTP 服务器                  | 邮件发送（选用时）          |
| OAuth Provider               | 微信/飞书登录（选用时）     |

**离线环境**：使用[离线部署包](https://bucket.godot.qzz.io/images/latest/ecoctrl.zip)可跳过 GHCR 和 Docker Hub 的直接访问。

## 系统资源建议

| 规模 | CPU  | 内存  | 磁盘空间    | 适用场景                            |
| ---- | ---- | ----- | ----------- | ----------------------------------- |
| 小型 | 2 核 | 4 GB  | 20 GB SSD   | 测试评估、小型建筑监控              |
| 中型 | 4 核 | 8 GB  | 50 GB SSD   | 日常生产（少于 500 点位）           |
| 大型 | 8 核 | 16 GB | 100 GB+ SSD | 大型设施（1000+ 点位、3D 模型存储） |

磁盘空间主要消耗于：

- **PostgreSQL 数据目录**：历史能耗数据随运行时间增长
- **MinIO 对象存储**：上传的 3D 模型、插件和附件文件
- **服务端日志**：pino JSON 日志文件（按 `LOG_MAX_DAYS` 配置自动轮转）

## 操作系统兼容性

EcoCtrl 的 Docker 镜像基于 `node:24-alpine` 和 `postgres:16-alpine`，可在任何支持 Docker 的操作系统上运行，包括：

- **Linux** (Ubuntu 22.04+, Debian 12, CentOS Stream 9, 等)
- **macOS** (Docker Desktop)
- **Windows** (Docker Desktop / WSL2, 仅限测试环境)

生产环境推荐使用 Linux (Ubuntu 24.04 LTS)。
