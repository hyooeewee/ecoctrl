# 架构总览

本页是 EcoCtrl 的运行时视角：请求如何流转、各组件分工、底层基于什么构建。关于工作区结构与工具链，请见 [Monorepo 结构](/zh/guide/monorepo)。

## 高层结构图

```
                        ┌────────────────────────┐
                        │        浏览器          │
                        │  apps/web │ apps/admin │
                        └───────────┬────────────┘
                                    │ /api  /static
                                    ▼
                ┌──────────────────────────────────────┐
                │   反向代理（Docker 中为 Caddy /      │
                │   开发环境为 Vite dev proxy）        │
                └───────────┬──────────────────────────┘
                            │
                ┌───────────▼──────────────┐
                │  packages/server         │
                │  Fastify 5 + Zod         │
                │  ─ JWT + Refresh Token   │
                │  ─ /api 路由             │
                │  ─ /static/models/* 静态 │
                │  ─ /documentation Swagger│
                └───────────┬──────────────┘
                            │
        ┌───────────────────┼─────────────────────────┐
        ▼                   ▼                         ▼
  ┌───────────┐    ┌──────────────────┐    ┌──────────────────┐
  │ PostgreSQL │    │  本地上传目录     │    │ 第三方 IoT 网关  │
  │  Drizzle   │    │  /static/models  │    │（自动刷新令牌）   │
  │  ORM       │    │                  │    │                  │
  └───────────┘    └──────────────────┘    └──────────────────┘
```

前端 bundle 总是请求字面量 `/api` 与 `/static` 前缀；前置代理把它们改写到真实的后端主机。修改后端主机或路径前缀属于运行时配置变更，永远不需要重新构建。

## 前端应用

### `apps/web` — 公共 3D 门户

- React Router 7 framework 模式
- Babylon.js 场景（`apps/web/public/building.glb` + `useSettingsStore`）
- TailwindCSS v4
- 自研 i18n：`apps/web/app/locales/{en,zh}/*.json` 通过 Zustand store 暴露
- 仅作客户端渲染 — 不使用 SSR，bundle 以静态文件方式部署

### `apps/admin` — 内部管理后台

- React 19 SPA，**Tab 式** 路由（状态保存在 `App.tsx`，未使用 React Router）
- Recharts 提供分析图表，Base UI 提供组件原语
- 仅请求 `/api/*`；初始管理员账号在首次运行时自动创建

### 前端共用约定

- 别名 `@/`（admin）与 `~/`（web）分别指向各 App 自己的源码
- `~/components/ui`（web）保留项目本地的 shadcn 组件副本，公共组件库代码放在 `@ecoctrl/ui`
- 每个 App 的 `vite.config.ts` 继承 `@ecoctrl/shared` 的 `viteConfig` 并注册 `resolveUiAlias()`，让 `@ecoctrl/ui` 源码能在消费 App 中编译

## 后端（`packages/server`）

服务端是一个 Fastify 5 单进程，从 `packages/server/index.ts` 启动：

```ts
await fastify.register(databasePlugin);
await fastify.register(fastifyJwt, { secret, sign: { expiresIn: "15m" } });
await fastify.register(cors, { origin: process.env.CORS_ORIGIN?.split(",") || true });
await fastify.register(multipart, { limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
await fastify.register(fastifyStatic, { root: "uploads/models", prefix: "/static/models/" });
await fastify.register(swagger, { ... }); // 从 Zod schema 自动生成 OpenAPI
await fastify.register(swaggerUi, { routePrefix: "/documentation", ... });
await fastify.register(apiRoutes, { prefix: "/api" });
```

关键设计：

- **类型 provider**：`fastify-type-provider-zod` — 每条路由的 body、querystring 与 response 都用 Zod 校验，同一份 schema 同时驱动 OpenAPI 文档。
- **认证网关**：`routes/index.ts` 中的单个 `onRequest` 钩子拦截所有 `/api/*` 请求，要求携带 JWT，仅放行明确列出的公开路径（登录、注册、刷新、OAuth、公开看板）。
- **静态资源**：上传的 3D 模型保存在磁盘 `uploads/models/`，对外通过 `/static/models/*` 暴露。
- **数据库连接**：一个 Fastify 插件初始化 Drizzle 连接池并装饰 `fastify.db`，所有 repository 共享同一连接。
- **启动流程**：`ensureDatabase()` 与 `syncSmtpFromEnv()` 在监听端口前运行 — 前者在权限允许时创建数据库，后者把 `.env.local` 中的 SMTP 凭据同步到 `platform_configs` 表。

### 分层代码结构

```
packages/server/src/
├── routes/         # HTTP 层 — 校验、鉴权、错误映射
├── services/       # 跨切面工作流（IoT 代理、邮件等）
├── repositories/   # 数据库访问函数（createXxx、findXxx）
├── schemas/        # Drizzle 表定义（一文件一张表）
├── plugins/        # Fastify 插件（database）
├── lib/            # 纯函数辅助（paths、mailer、ensureDatabase）
└── config/         # 环境驱动的配置
```

Repository 函数遵循 Prisma 风格（`createXxx`、`findManyXxx`、`findXxxByYyy`），返回 `T | null` 而非 `boolean`。路由层不会直接 import Drizzle，全部通过 repository 访问数据。

## 构建流水线

| 包                               | 工具                               | 输出                                              |
| -------------------------------- | ---------------------------------- | ------------------------------------------------- |
| `apps/web`、`apps/admin`         | `vp build`（vite-plus + Rolldown） | 静态 SPA bundle                                   |
| `packages/server`                | `rolldown`                         | `dist/index.mjs` + 自动生成的 `dist/package.json` |
| `apps/docs`                      | `vitepress build`                  | `.vitepress/dist/` 下的静态站点                   |
| `packages/ui`、`packages/shared` | 无 — 以源码形式被消费              | 不适用                                            |

服务端的 Rolldown 配置把所有 bare specifier 与 Node 内置全部外部化。一个自定义插件随后扫描 bundle 用到的外部 import，从源 `package.json` 中读取版本，写出仅包含运行时依赖的全新 `dist/package.json`。产物自包含，`pnpm install --prod` 即可运行。

具体的产物如何被打包成 Docker 镜像，请参见 [部署指南](/zh/reference/deployment)。

## 运行时拓扑

EcoCtrl 支持两种部署形态，共用同一份编译产物：

### 本地开发

```
node tsx --watch  ──►  Fastify (3000)
vite-plus dev     ──►  admin (5173)
vite-plus dev     ──►  web   (8080)
vitepress dev     ──►  docs  (5174)
```

`@ecoctrl/shared` 的 `createDevProxy(API_BASE_URL)` 返回一个 Vite proxy 块，仅在主机为 `localhost` 时把 `/api` 与 `/static` 转发到 API — 这样在真实域名背后部署同一份 Vite 配置不会出现双层代理。

### Docker Compose（`docker/compose.yml`）

```
postgres:16-alpine      :5432
ecoctrl-server (Node)   :3000
ecoctrl-admin (Caddy)   :4173 → /api /static 重写到 http://server:3000
ecoctrl-web   (Caddy)   :8081 → /api /static 重写到 http://server:3000
```

每个 App 的 Dockerfile 产出小镜像：SPA bundle + 一份用于改写 API/static 前缀的 Caddyfile。Compose 文件挂载各 App 的 `.env.local`，因此后端主机与前缀都可以在不重新构建的前提下调整。

## IoT 代理层

`/api/iot/*` 路由代理一个第三方网关，token 刷新逻辑统一处理：

- `iot_tokens` 表存储 access/refresh 对，以及绝对过期时间（毫秒时间戳）。
- 服务端工具函数在每次外发请求前检查过期时间，需要时刷新并持久化新的 token。
- 客户端永远只调用 EcoCtrl，不会接触上游凭据。

## 工作流引擎

工作流引擎（`packages/server/src/engine/`）执行 JSON DSL 定义的 DAG。每个工作流有一个触发器（状态变更、定时、手动、Webhook 或事件）和一个节点图。

- **`validator.ts`** — 校验 DSL 结构（节点 ID、边连通性、必填字段）。
- **`expr.ts`** — 轻量级表达式求值器，用于条件和变量插值。
- **`trigger.ts`** — 根据传入数据判断触发器是否应该触发。
- **`executor.ts`** — 顺序运行节点图，维护 `ExecutionContext`（变量、节点输出、环境）。
- **`template.ts`** — 字符串模板，用于 HTTP 请求体、邮件主题等。

节点分为**控制**节点（`start`、`end`、`condition`、`switch`、`loop`、`parallel`、`delay`）和**动作**节点（`http_request`、`database`、`email`、`variable`）。每个节点可以声明 `onError` 处理器，策略包括：`retry`、`skip`、`abort` 或 `goto` 到指定节点。

admin 后台提供可视化编辑器（`WorkflowCanvas.tsx`，基于 XYFlow）。工作流持久化到 `workflows` 表，可通过手动、pg-boss 定时或公开 `POST /api/webhook/:slug` 端点执行。

## 队列与 Worker 系统

`packages/server` 使用 [pg-boss](https://github.com/timgit/pg-boss) 处理后台任务：

- **`queue/pgboss.ts`** — 针对同一 PostgreSQL 数据库初始化 pg-boss 实例。
- **`queue/worker.ts`** — 注册任务处理器（报表生成、备份任务、工作流执行）。

任务通过 `boss.send('queue-name', payload, options)` 入队，由 Worker 在同一 Node 进程中处理。生产环境 Worker 与 API 服务器同进程运行；开发环境自动启动。失败任务以指数退避重试，直到达到可配置上限。

## 仪表盘组件

`apps/web` 在公共门户渲染可拖拽的组件网格。组件类型包括统计卡片、图表、列表、天气和能耗图表。布局指标（`layoutX`、`layoutY`、`layoutW`、`layoutH`）和数据绑定（`dataType`、`dataJson`）存储在 `dashboard_widgets` 表中。天气组件需要 `OPENWEATHER_API_KEY`；缺失时自动隐藏。

## 3D 模型管道

3D 模型通过 admin 后台上传（`ModelFileZone.tsx` + `ModelViewer.tsx`），保存在磁盘 `uploads/models/`。`models` 表跟踪元数据；`dashboard_models` 存储场景配置（相机预设、环境光强度、热点位置和标签）。web 门户通过 Babylon.js（`building-view.tsx`）和公开端点 `GET /api/public/model` 加载模型。

## 文档站点（`apps/docs`）

VitePress 2，使用 [bilingual locales](https://vitepress.dev/guide/i18n)：英文位于根路径，简体中文位于 `/zh/`。内容存放在 `apps/docs/{guide,reference,zh}` 下，部署到 `ecoctrl.godot.run`。公共看板的只读访问通过把 `GET /api/public/dashboard` 加入公共白名单实现。
