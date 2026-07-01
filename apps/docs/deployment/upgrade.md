---
title: 版本升级指南
description: GHCR 拉取新镜像、数据库迁移、破坏性变更检查
---

# 版本升级指南

EcoCtrl 的版本管理遵循 [SemVer](https://semver.org) 规范。Docker 镜像标签使用语义化版本（如 `v1.2.3`），`latest` 标签指向最新的稳定版本。

---

## 标准升级流程

### 第一步：查看更新日志

在升级前，查阅 [GitHub Releases](https://github.com/hyooeewee/ecoctrl/releases) 了解新版本的变更内容、破坏性变更和迁移说明。

### 第二步：备份数据库

```bash
# 执行完整数据库备份
cd docker
docker compose exec -T postgres pg_dump -U ecoctrl ecoctrl > pre_upgrade_$(date +%Y%m%d).sql
```

> 升级前务必备份数据库。如果升级涉及数据库迁移（migration），回滚时需要此备份。

### 第三步：拉取新镜像

```bash
# 拉取所有服务的最新镜像
docker compose pull

# 或指定版本标签（推荐生产环境使用）
docker compose pull --image-policy=always
```

### 第四步：重启服务

```bash
docker compose up -d
```

新镜像将自动替换旧容器。如果 `compose.yaml` 使用了 `:latest` 标签，Docker 会使用刚拉取的最新镜像。

### 第五步：运行数据库迁移

API 服务启动时默认自动运行 Drizzle 迁移（migration）。如果未自动执行，可手动运行：

```bash
docker compose exec server npx drizzle-kit migrate
```

> 迁移过程可能耗时数秒到数分钟（取决于数据量）。迁移期间 API 服务保持可用，但部分新功能可能暂不可用，直到迁移完成。

### 第六步：验证升级

```bash
# 检查服务健康状态
curl http://localhost:3000/health

# 检查版本信息
curl http://localhost:3000/api/version

# 查看所有容器运行状态
docker compose ps

# 检查工作流执行是否正常
docker compose logs server | grep "workflow"
```

---

## 破坏性变更检查清单

| 类别     | 检查项                                   | 说明                                 |
| -------- | ---------------------------------------- | ------------------------------------ |
| 数据库   | 检查是否有新增数据库迁移                 | 缺少迁移会导致 500 错误              |
| 环境变量 | 检查是否有新增/废弃/必填的环境变量       | 缺少必填变量会导致服务启动失败       |
| API      | 检查 API 路由或响应格式是否有变化        | 前端可能因接口变更而功能异常         |
| 前端     | 检查是否有浏览器兼容性变化               | 可能需要更新浏览器版本               |
| OAuth    | 检查回调 URL 是否有变化                  | 需同步更新 OAuth 提供商的白名单      |
| Docker   | 检查 `compose.yaml` 是否有服务或端口变更 | 数据卷、端口映射或网络配置可能受影响 |
| 3D 模型  | 检查 3D 模型格式是否有变更               | 旧模型文件可能需要重新导出           |
| 配置     | 检查是否有新增的配置文件或配置项         | 可能需要更新 `docker/.env.local`     |

### 如何检查变更

```bash
# 对比 compose.yaml 变化
git diff v1.2.3..v2.0.0 -- docker/compose.yaml

# 查看环境变量变更
git diff v1.2.3..v2.0.0 -- docker/.env.example

# 查看数据库迁移文件
ls packages/server/src/db/migrations/

# 查看新增 API 路由
git diff v1.2.3..v2.0.0 -- packages/server/src/routes/
```

---

## 版本回退

如果升级后发现问题，按以下步骤回滚：

### 回滚数据库

```bash
# 1. 停止服务
docker compose down

# 2. 恢复数据库（使用升级前的备份）
cat pre_upgrade_20260701.sql | docker compose exec -T postgres psql -U ecoctrl -d ecoctrl

# 3. 回滚镜像版本
# 编辑 compose.yaml，将 image 标签改回旧版本号

# 4. 启动服务
docker compose up -d
```

### 使用指定版本标签

```yaml
# compose.yaml 中指定具体版本（生产环境推荐）
services:
  server:
    image: ghcr.io/hyooeewee/ecoctrl-server:v1.2.3
  web:
    image: ghcr.io/hyooeewee/ecoctrl-web:v1.2.3
  admin:
    image: ghcr.io/hyooeewee/ecoctrl-admin:v1.2.3
```

> **推荐做法**：生产环境始终使用具体版本标签（如 `v1.2.3`），而非 `latest`。这样回滚时只需修改标签值并重启。

---

## 多环境升级策略

| 环境 | 升级方式                              | 说明                       |
| ---- | ------------------------------------- | -------------------------- |
| 开发 | 直接拉取 `:latest` 或 `:dev` 标签     | 快速迭代，允许短暂不可用   |
| 测试 | 使用预发布标签，运行自动化测试套件    | 验证无破坏性变更后升级生产 |
| 生产 | 滚动升级（先升级 server，再升级前端） | 分批升级，监控每批服务状态 |

### 生产环境滚动升级

```bash
# 1. 先升级 API 服务
docker compose up -d server
# 检查：curl http://localhost:3000/health

# 2. 再升级前端
docker compose up -d web admin

# 3. 最后手动执行数据库迁移（如未自动运行）
docker compose exec server npx drizzle-kit migrate

# 4. 全面验证
docker compose ps
```
