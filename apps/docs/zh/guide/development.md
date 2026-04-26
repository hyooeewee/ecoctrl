# 开发指南

本页介绍如何搭建本地开发环境，让 API 服务、admin 后台、web 门户与文档站点全部支持热更新。

## 前置要求

- **Node.js** ≥ 20.0.0（推荐 24，发布流水线使用 24）
- **pnpm** ≥ 10.33.1 — 版本通过 `package.json` 中的 `packageManager` 字段固定。最简单的方式是启用 corepack：

  ```bash
  corepack enable
  corepack prepare pnpm@10.33.1 --activate
  ```

- **PostgreSQL** ≥ 16。可选择本地安装，或使用 `docker/compose.yml` 中的 Postgres 服务。

## 1. 克隆与安装

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
cd ecoctrl
pnpm install
```

`pnpm install` 会按 catalog 锁定的版本解析整个工作区，包括 React、Tailwind、vite-plus 等共享依赖。详见 [Monorepo 结构](./monorepo)。

## 2. 启动 PostgreSQL

如果本地没有 PostgreSQL，可使用内置的 Docker 服务：

```bash
cd docker
docker compose -f compose.yml up postgres -d
cd ..
```

默认凭据与 API 默认值一致：用户 `ecoctrl`，密码 `ecoctrl_secret`，数据库 `ecoctrl`，监听 `localhost:5432`。

## 3. 配置环境变量

每个 App 优先读取 `.env.local`，未配置时回落到 `.env.example`。

```bash
# API 服务
cp packages/server/.env.example packages/server/.env.local
# 设置 DATABASE_URL 与 JWT_SECRET，其他变量按需配置。

# Admin 后台
cp apps/admin/.env.example apps/admin/.env.local

# Web 门户 — apps/web 自带 .env.local 默认值，通常无需修改。
```

完整的变量参考见 [环境变量](/zh/reference/env-vars)。

## 4. 初始化数据库

如果 Postgres 角色拥有 `CREATE DATABASE` 权限，API 服务会在首次启动时自动创建数据库。运行以下命令推送 schema 并写入示例数据：

```bash
cd packages/server
pnpm db:push     # 推送 Drizzle schema
pnpm db:seed     # 插入示例用户、看板、能耗数据
cd ../..
```

其他常用数据库脚本：

| 命令 | 作用 |
|---|---|
| `pnpm db:migrate` | 应用 `drizzle/` 下的待执行迁移 |
| `pnpm db:studio` | 在浏览器中打开 Drizzle Studio |
| `pnpm db:refresh` | 删库 → push → seed → 打开 Studio。**会清空所有数据** |
| `pnpm db:generate` | 根据 schema 差异生成新的迁移 |

## 5. 启动开发服务

一次性全部启动：

```bash
pnpm dev
```

或者按需单独启动：

```bash
pnpm dev:server     # API 在 http://localhost:3000
pnpm dev:admin      # admin 在 http://localhost:5173
pnpm dev:web        # web 在 http://localhost:8080
pnpm dev:docs       # 当前文档站点在 http://localhost:5174
```

API 服务由 `tsx --watch` 启动，绝大多数改动无需重启即可热更新。`apps/admin` 和 `apps/web` 都使用 Voidzero 的 vite-plus，兼容标准 Vite 开发服务协议。

## 各 App 常用命令

每个前端 App 都使用 vite-plus 提供的 `vp` CLI。在 `apps/admin` 或 `apps/web` 内执行：

```bash
vp dev      # 启动开发服务
vp build    # 生产构建
vp check    # 格式 + 静态检查 + 类型检查（项目质量门）
vp fmt      # 仅格式化
vp lint     # 仅静态检查
```

`vp check` 是项目代码质量的唯一入口 — 它把格式化、Linter 与类型检查一起跑。

## 项目通用约定

- **代码注释与文档字符串**：仅使用英文。
- **面向用户的文案**：通过 `apps/web/app/locales/` 提供 i18n（web 门户）；admin 直接使用内联文案。
- **API 路由命名**：复数名词、最多两层嵌套（`/users/:id/avatar` ✅、`/users/:id/profile/avatar` ❌）。
- **Repository 函数**：采用 Prisma 风格命名 — `createXxx`、`findManyXxx`、`findXxxByYyy`。返回 `T` 或 `null`，避免返回 `boolean`/`void`。
- **路径别名**：
  - `@/` → `src/`（server 与 admin）
  - `~/` → `app/`（web）
  - `~/components/ui` → shadcn/ui 组件（web）

## 接下来该看哪里

- 想了解 **`vite` 为什么解析到 vite-plus，以及 `@ecoctrl/ui` 如何以源码方式被消费** → [Monorepo 结构](./monorepo)。
- 在新增路由前先研究 **API 全貌** → [API 路由](/zh/reference/api)。
- 规划 **生产部署** → [部署指南](/zh/reference/deployment)。
