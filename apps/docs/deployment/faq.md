---
title: 常见问题排查
description: 安装/认证/3D可视化/构建部署/运行时故障分类索引
---

# 常见问题排查

本文按类别列出 EcoCtrl 部署和使用中的常见问题及解决方法。

---

## 安装与配置

### Node.js 版本不匹配

**现象**：`pnpm install` 时出现引擎版本错误，或 `node --version` 显示非 24.x。

**解决**：

```bash
# 使用 nvm 切换到正确的 Node.js 版本
nvm install 24
nvm use 24

# 或使用 corepack 启用自动版本管理
corepack enable
pnpm --version  # 应显示 10.33.1+
```

### pnpm 版本不匹配

**现象**：`pnpm install` 报错 `ERR_PNPM_UNEXPECTED_STORE` 或 `Unsupported pnpm version`。

**解决**：

```bash
# 启用 corepack 自动管理版本
corepack enable
corepack prepare pnpm@10.33.1 --activate

# 或直接安装指定版本
npm install -g pnpm@10.33.1
```

### 数据库 "ecoctrl" 不存在

**现象**：API 启动时报 `database "ecoctrl" does not exist`。

**解决**：

```bash
# 手动创建数据库
docker compose exec postgres createdb -U ecoctrl ecoctrl

# 执行迁移和种子数据
pnpm db:push
pnpm db:seed
```

> Docker 部署的用户请使用 `docker compose exec server pnpm db:push` 和 `docker compose exec server pnpm db:seed` 替代，宿主机上的 pnpm 无法直接连接容器内的数据库。

### 端口冲突

**现象**：`docker compose up` 时报 `port is already allocated`。

**解决**：

```bash
# 检查占用端口的进程
sudo lsof -i :3000   # API 端口
sudo lsof -i :4173   # Admin 端口
sudo lsof -i :8081   # Web 端口

# 修改 docker/.env.local 中的端口变量
SERVER_PORT=3001
ADMIN_PORT=4174
WEB_PORT=8082
```

---

## 认证与授权

### 15 分钟被强制登出

**现象**：登录后每 15 分钟被强制退出，频繁弹出登录页面。

**原因与解决**：
| 原因 | 检查方法 | 解决 |
| ------------------------ | -------------------------------------------- | ----------------------------------- |
| Access Token 正常过期 | 浏览器 Console 是否有 `/auth/refresh` 报错 | 前端应自动刷新，检查网络连接 |
| `JWT_SECRET` 前后不一致 | 检查 `.env.local` 是否被修改或覆盖 | 统一所有环境的 `JWT_SECRET` 值 |
| 服务端时间不同步 | `docker compose exec server date` | 同步服务器时间（NTP） |
| Token 存储异常 | 浏览器 Application > Local Storage | 清除 Storage 后重新登录 |

### OAuth 按钮点击无反应

**现象**：点击微信/飞书登录按钮后页面不跳转或报错。

**解决**：

```bash
# 检查 OAuth 配置是否加载
curl http://localhost:3000/api/auth/oauth/providers

# 确认浏览器允许弹窗
# 检查回调 URL 是否与 OAuth 提供商后台配置一致
# 回调 URL 格式：{BASE_URL}/api/auth/oauth/{provider}/callback

# 查看服务端日志中的 OAuth 错误
docker compose logs server | grep -i oauth
```

---

## 3D 可视化

### 建筑视图黑屏

**现象**：打开 Web 门户页面显示黑屏，浏览器控制台无报错。

**可能原因**：

| 原因                     | 检查方法                                         | 解决                               |
| ------------------------ | ------------------------------------------------ | ---------------------------------- |
| 未上传建筑模型           | Admin 后台 > 3D 配置 > 模型管理                  | 上传 .glb/.gltf 格式的 3D 模型     |
| WebGL 不兼容             | 访问 `chrome://gpu` 检查 WebGL 状态              | 更新显卡驱动或更换浏览器           |
| 默认模型文件缺失         | 检查 `apps/web/public/building.glb` 文件是否存在 | 上传模型或恢复默认模型文件         |
| BASE_URL 配置错误        | 检查 3D 模型资源加载的 URL 是否正确              | 调整 `BASE_URL` 或 `STATIC_PREFIX` |
| 模型文件损坏或格式不兼容 | 浏览器网络面板查看模型加载 HTTP 状态             | 重新导出模型为 glTF 2.0 格式       |

> Babylon.js 加载模型失败时默认静默处理，不会在前端抛出明显的错误提示。建议打开浏览器开发者工具的 Network 面板，筛选 glb/gltf 请求查看是否返回 404。

### 3D 模型加载慢

**解决**：

- 压缩模型文件：使用 `gltf-transform` 或 Draco 压缩
- 启用 MinIO 缓存：确保模型文件存储在 MinIO 而非数据库
- 网络优化：将模型文件部署到 CDN 或使用更近的服务器

### 自动旋转相机不工作

**现象**：3D 场景静止不动，页面没有进入自动旋转模式。

**检查**：

1. Admin 后台 > 3D 配置 > 相机设置，检查「自动旋转」是否开启
2. 确认用户交互后超时时间配置是否合理（默认 30 秒无操作后恢复旋转）

---

## 构建部署

### `resolveUiAlias` 错误

**现象**：`pnpm build` 时出现 `Module not found: Error: Can't resolve '#ui/...'`。

**原因**：TypeScript 路径别名 `#ui` 未正确解析。

**解决**：

```bash
# 确保已构建 UI 组件库
pnpm --filter @ecoctrl/ui build

# 确认 vite.config.ts 已引入 resolveUiAlias() 插件
# pnpm install 完成后清除缓存重试
pnpm clean
pnpm install
pnpm build
```

### 找不到工作空间包

**现象**：`pnpm build` 时报 `ERR_PNPM_NO_PACKAGE_MANIFEST` 或 `Cannot find module '@ecoctrl/shared'`。

**解决**：

```bash
# 确认所有依赖包已安装
pnpm install

# 确认工作空间配置正确
cat pnpm-workspace.yaml
# 应包含:
# packages:
#   - 'apps/*'
#   - 'packages/*'

# 按依赖顺序构建
pnpm --filter @ecoctrl/shared build
pnpm --filter @ecoctrl/server build
pnpm --filter @ecoctrl/web build
pnpm --filter @ecoctrl/admin build
```

### Docker 构建失败 (OOM)

**现象**：`docker compose -f compose.build.yaml build` 失败，进程退出码 137 (SIGKILL)。

**解决**：

```bash
# 使用串行构建脚本（推荐）
cd docker
./build.sh

# 或手动设置 Node 内存限制后逐个构建
docker compose -f compose.build.yaml build --memory=2g server
docker compose -f compose.build.yaml build --memory=1g web
docker compose -f compose.build.yaml build --memory=1g admin
```

### API_BASE_URL 修改后前端无变化

**现象**：修改 `API_BASE_URL` 后刷新页面，前端仍然请求旧地址。

**解决**：前端使用字面量 `/api` 前缀，运行时的反向代理（Caddy）负责将请求改写转发到后端。修改 Caddyfile 或 Nginx 配置即可，无需重新构建前端。

---

## 运行时故障

### 数据库连接失败

**现象**：服务端启动时日志报 `Error: connect ECONNREFUSED 127.0.0.1:5432`。

**检查清单**：

1. PostgreSQL 容器是否正在运行：`docker compose ps | grep postgres`
2. `DATABASE_URL` 格式是否正确：`postgresql://user:password@host:5432/dbname`
3. 启动顺序：PostgreSQL 先准备就绪后再启动 server（健康检查应确保顺序）
4. 网络连通性：`docker compose exec server ping postgres`

### API 响应缓慢

**现象**：前端页面加载缓慢，API 请求耗时超过 2 秒。

**排查步骤**：

```bash
### 检查数据库连接数
docker compose exec postgres psql -U ecoctrl -c "SELECT count(*) FROM pg_stat_activity;"

### 检查慢查询
docker compose exec postgres psql -U ecoctrl -c "
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

### 检查服务器资源使用
docker compose stats
```

### 邮件发送失败

**现象**：密码重置邮件、通知邮件无法发送。

**排查**：

```bash
### 检查 SMTP 配置
docker compose logs server | grep -i smtp

### 测试 SMTP 连接
# 在 Admin 后台系统配置 > SMTP 设置中点击「发送测试邮件」

### 检查 pg-boss 队列中待发送邮件
docker compose exec postgres psql -U ecoctrl -c "
SELECT count(*) FROM pgboss.job WHERE name = 'send-email' AND state = 'created';
"
```

### 数据不同步

**现象**：Web 门户或 Admin 后台显示的数据不是最新值。

**可能原因**：

- **SSE 连接断开**：检查浏览器网络面板的 SSE EventStream 连接状态
- **缓存未刷新**：硬刷新页面 (Ctrl+Shift+R) 清除浏览器缓存
- **IoT 数据上报延迟**：检查 `BASE_URL` 连通性及 IoT 设备状态
- **Mock 模式激活**：查看日志中是否有 `[lighting]` Mock 告警标记

### 磁盘空间不足

**现象**：服务异常、Docker 操作失败，报 `no space left on device`。

**清理步骤**：

```bash
### 清理 Docker 无用的镜像和卷
docker system prune -af

### 检查数据卷使用情况
docker system df

### 清理 MinIO 中的过期模型文件
# Admin 后台 > 存储管理 > 清理未引用模型

### 检查 PostgreSQL 数据大小
docker compose exec postgres psql -U ecoctrl -c "
SELECT pg_database_size('ecoctrl')/1024/1024 as size_mb;
"
```

### 运行 `pnpm db:push` 后 Admin 无数据

**现象**：数据库迁移执行成功，但 Admin 后台显示空白无数据。

**解决**：

```bash
# 运行种子数据填充脚本
pnpm db:seed

# 如需完全重置数据库（破坏性操作，清除所有数据）
pnpm db:refresh
```
