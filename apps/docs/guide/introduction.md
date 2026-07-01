# EcoCtrl 是什么

EcoCtrl 是一个 **能源与 IoT 控制平台**，将 3D 建筑可视化门户、实时监控管理后台、REST API 后端整合在一个 pnpm 单仓库中。

它面向需要完成以下工作的设施团队：

- 在 3D 视图中可视化多楼层建筑与设备，叠加热点标注与实时数据。
- 实时监控能耗、故障与 IoT 设备状态。
- 在统一控制台管理设备、用户、告警、维护计划与报表。
- 通过类型化代理层接入第三方 IoT 网关。

## 一图看懂

| 层级              | 技术栈                                          | 用途                                        |
| ----------------- | ----------------------------------------------- | ------------------------------------------- |
| `apps/web`        | React Router 7 + Babylon.js + TailwindCSS v4    | 公共 3D 门户 — 楼宇视图、楼层、系统、分析   |
| `apps/admin`      | React 19 + Recharts + TailwindCSS v4            | 内部管理后台 — 账号、设备、模型、报表、设置 |
| `apps/docs`       | VitePress 2                                     | 当前文档站点                                |
| `packages/server` | Fastify 5 + Drizzle ORM + PostgreSQL + Rolldown | REST API 与 IoT 网关代理                    |
| `packages/ui`     | React + Base UI + TailwindCSS v4                | 共享组件库（shadcn/ui 风格）                |
| `packages/shared` | Zod + TypeScript                                | 共享 schema、类型与 Vite 工具               |

## 高层架构

```
                ┌───────────────────────────────┐
                │     浏览器（web / admin）     │
                └───────────────┬───────────────┘
                                │ HTTPS
                                ▼
                ┌───────────────────────────────┐
                │   Caddy 反向代理（TLS）       │
                │   /api/* → server  /static/*  │
                └───────────────┬───────────────┘
                                │
            ┌───────────────────┴────────────────────┐
            ▼                                        ▼
  ┌──────────────────┐                     ┌──────────────────┐
  │ 静态 SPA 包       │                     │ Fastify API       │
  │ (admin / web)    │                     │ Drizzle + Postgres│
  └──────────────────┘                     └──────────┬────────┘
                                                      │
                                                      ▼
                                          ┌──────────────────────┐
                                          │ 第三方 IoT 接口       │
                                          │ （自动刷新令牌）       │
                                          └──────────────────────┘
```

每个客户端 App 都用固定的 `/api` 前缀访问后端；真实的后端主机由开发模式下的 Vite 代理或生产环境下的 Caddy 在运行时改写。这意味着 **修改 API 主机或前缀完全不需要重新构建前端**。

## 接下来该看哪里

- 第一次接触？先看 [快速上手](./getting-started)。
- 想搭建本地开发环境？查看 [开发指南](./development)。
- 想了解工作区结构与 vite-plus 工具链？阅读 [Monorepo 结构](./monorepo)。
- 寻找运行时细节？参考 [架构总览](/reference/architecture) 与 [API 路由](/reference/api)。
