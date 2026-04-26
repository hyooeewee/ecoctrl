# 常见问题

EcoCtrl 在搭建与日常运行过程中最常遇到的问题与解决方案。

## 安装

### `pnpm install` 报告 Node 版本不兼容

发布流水线使用 Node 24，而很多依赖声明 `engines.node >= 20`。如果看到 `Unsupported engine`，请切换到受支持的版本：

```bash
nvm install 24 && nvm use 24
# 或者使用 fnm：
fnm install 24 && fnm use 24
```

### `pnpm install` 缓慢 / pnpm 版本不对

仓库锁定 `pnpm@10.33.1`。建议通过 corepack 保证版本一致：

```bash
corepack enable
corepack prepare pnpm@10.33.1 --activate
```

### API 启动报 `database "ecoctrl" does not exist`

默认情况下，API 在首次启动时会尝试自动创建数据库（前提是 Postgres 角色具备 `CREATE DATABASE` 权限）。在禁用此权限的托管服务上，请先手动建库：

```sql
CREATE DATABASE ecoctrl;
```

然后重新执行 `pnpm db:push` 与 `pnpm db:seed`。

### `db:push` 成功，但 admin 提示 “暂无数据”

还需要导入种子数据：

```bash
cd packages/server
pnpm db:seed
```

如果想完全重置，可执行 `pnpm db:refresh`，它会按顺序执行 **drop → push → seed → 打开 Drizzle Studio**。这是破坏性命令 — 切勿在生产数据库上执行。

## 认证

### 为什么我每 15 分钟会被退出？

Access Token 故意设计为短生命周期（15 分钟）。前端会在 Refresh Token 仍有效时自动调用 `/api/auth/refresh` 获取新的 Access Token。如果你被强制登出：

- 检查浏览器 Console 是否有刷新失败的报错。
- 确认服务重启之间 `JWT_SECRET` 没有变化（更新该密钥会让所有已签发的 Token 失效）。

### “在第二台设备登录后，原设备被踢下线了”

这是有意的设计。EcoCtrl 当前每个用户只保留一个有效的 Refresh Token，新设备登录会清除旧的。如果你的团队需要多端登录，需要在服务端调整（参见 `routes/auth.ts`）。

### OAuth 登录按钮没反应

按钮会打开一个弹出窗口。请确认浏览器允许 admin 域名弹窗。可用的 Provider 列表由 `GET /api/auth/oauth/providers` 返回 — 如果该接口返回空，说明服务端 `.env.local` 中没有配置 OAuth 凭据。

## 3D 门户

### 楼宇视图显示黑屏

web 门户依赖 `apps/web/public/building.glb`。该文件缺失或损坏时，Babylon 场景会静默失败。请确认文件存在且为合法的 glTF 二进制。

### 如何调整相机、灯光、热点？

所有 3D 参数都保存在 `useSettingsStore`（`apps/web/app/store/settings.ts`），通过 `/api/dashboard/settings` 同步。打开 admin 后台，进入 **3D 配置** 修改保存即可。Web 门户在下次刷新时拉取最新配置。

## 构建与部署

### `vp build` 报 “Cannot find module @ecoctrl/ui/...”

`@ecoctrl/ui` 是以 **源码形式** 被消费的，无需单独构建。如果 import 失败，请确认 `pnpm install` 成功完成，并且 `apps/<your-app>/vite.config.ts` 已经引入 `@ecoctrl/shared` 提供的 `resolveUiAlias()` 插件。

### Docker 构建报 “workspace package not found”

Docker 镜像必须从 monorepo 根目录构建，而不是在 App 目录内：

```bash
docker build -f apps/admin/Dockerfile .
```

Dockerfile 假设 `pnpm-lock.yaml` 与整个工作区都存在于上下文中。

### 修改 `API_BASE_URL` 后前端没有变化

前端代码字面写死了 `/api` 前缀 — 真正的转发发生在运行时层：

- 开发环境：通过 Vite 的 proxy（`createDevProxy`）。
- 容器环境：通过 Caddy。
- release zip：通过 `start.sh` 与 `lws --rewrite`。

修改 API 主机或前缀 **不需要重新构建前端**，只需更新对应运行时层的环境变量（参见 [环境变量](/zh/reference/env-vars)）。

## 文档站

### 为什么 `/api/dashboard` 不需要 Token 也能访问？

它被有意放进了公共白名单，让 web 公共门户在不强制登录的前提下展示楼宇统计。`/api/dashboard/settings` 等修改接口仍要求认证。

### 本地文档服务无法启动

请在仓库根目录执行 `pnpm dev:docs`。文档站监听 `5174` 端口，避免与 admin（`5173`）冲突。

## 在哪里提 Issue

如果遇到本页未覆盖的问题：

1. 先在 [GitHub Issues](https://github.com/hyooeewee/ecoctrl/issues) 中搜索。
2. 提交新 issue，附带失败命令、完整报错与运行环境（`node -v`、`pnpm -v`、操作系统）。
