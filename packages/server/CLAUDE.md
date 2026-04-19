# packages/server

EcoCtrl 后端 API 服务，基于 Fastify 5 + TypeScript。

## 交互规则

- 任何编码或修改前，必须先输出执行计划。
- 计划需包含：
  - 涉及的文件列表（路径）。
  - 每个文件的拟操作（创建 / 修改 / 删除）。
- 输出计划后，明确请求确认（如："确认后开始执行。"）。
- 仅在收到 "确认""可以" 或 "执行" 后，方可动手。

## Stack

- **Framework:** Fastify 5, TypeScript (ESM)
- **ORM:** Drizzle ORM + drizzle-kit
- **Database:** PostgreSQL (via `postgres` driver)
- **Build:** Rolldown (`rolldown.config.ts`)
- **Process Manager:** PM2 (`ecosystem.config.cjs`)
- **Dev Runner:** tsx (watch mode)

## Common Commands

```bash
pnpm dev              # 开发模式 (tsx watch)
pnpm build            # Rolldown 打包到 dist/
pnpm preview          # staging 打包并运行
cd packages/server
pnpm start            # PM2 生产启动
pnpm stop             # PM2 停止
pnpm restart          # PM2 重启
pnpm check            # tsc --noEmit 类型检查
pnpm clean            # 删除 dist/

# 数据库操作
pnpm db:generate      # 生成迁移文件 (drizzle-kit generate)
pnpm db:migrate       # 执行迁移 (drizzle-kit migrate)
pnpm db:push          # 推送 schema 到数据库 (drizzle-kit push)
pnpm db:studio        # 打开 Drizzle Studio
pnpm db:seed          # 运行种子脚本 (scripts/seed.ts)
pnpm db:reset         # 运行重置脚本 (scripts/reset.ts)
pnpm db:drop:db       # 删除数据库 (scripts/drop.ts)
pnpm db:refresh       # 一键重置: drop + push + seed + studio
pnpm db:drop          # 删除最近一次迁移
```

## Project Structure

```
src/
  routes/         # Fastify 路由模块 (按业务域划分)
  schemas/        # Drizzle ORM 数据表 schema 定义
  repositories/   # 数据库访问层 (封装 Drizzle 查询)
  plugins/        # Fastify 插件注册
  lib/            # 工具函数和通用逻辑
  types/          # 服务端专有 TypeScript 类型
  config/         # 配置文件
scripts/          # 数据库脚本 (seed, reset, drop)
drizzle/          # 迁移文件输出目录
```

## Path Aliases

- `@/` 映射到 `./src/*` (在 `tsconfig.json` 和 `rolldown.config.ts` 中同时配置)

## Critical Constraints

- **不要修改 `drizzle/` 目录下的迁移文件**。这些由 `drizzle-kit` 自动生成。
- Schema 变更流程：修改 `src/schemas/*.ts` → `pnpm db:generate` → `pnpm db:migrate`
- 路由注册入口在 `src/routes/api.ts`，新增路由后需在此处注册。
- 数据库连接插件位于 `src/plugins/database.ts`。
- `.env.local` 存放环境变量（包含 `DATABASE_URL`、`PORT`、`HOST` 等）。

## 工作范围

- 仅修改 `packages/server` 内文件；`packages/shared`、`apps/*`、`.` 等其他目录只读并且积极获取最新的状态，如需修改请给出修改建议。
