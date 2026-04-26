# Monorepo 结构

EcoCtrl 是一个 [pnpm](https://pnpm.io/) 工作区，包含 3 个应用与 3 个共享包。本页解释一些不那么显而易见的设计决定 — 比如 `vite` 这个依赖名为何特殊、`@ecoctrl/ui` 为什么直接发布源码、版本如何保持同步。

## 工作区结构

```
ecoctrl/
├── apps/
│   ├── admin/          # React 19 管理后台（Tab 式 SPA）
│   ├── web/            # React Router 7 + Babylon.js 公共门户
│   └── docs/           # VitePress 2 文档站点
├── packages/
│   ├── server/         # Fastify 5 REST API
│   ├── ui/             # 共享组件库（shadcn/ui 风格、源码分发）
│   └── shared/         # Zod schema、类型与 Vite 工具
├── docker/             # Compose 清单与各 App 的 Dockerfile
├── scripts/            # release 包附带的 start.sh 与运行时脚本
└── pnpm-workspace.yaml
```

`pnpm-workspace.yaml` 同时声明了 `apps/*` 与 `packages/*` 为工作区。跨包导入直接使用发布名（`@ecoctrl/ui`、`@ecoctrl/shared` 等），开发期解析到本地源码。

## Catalog 锁定的依赖

工作区使用 [pnpm catalogs](https://pnpm.io/catalogs) 把共享依赖的版本集中在一处：

```yaml
catalog:
  "@base-ui/react": ^1.4.0
  react: ^19.2.5
  react-dom: ^19.2.5
  tailwindcss: ^4.2.2
  recharts: ^3.8.1
  vite: npm:@voidzero-dev/vite-plus-core@^0.1.18
  vitest: npm:@voidzero-dev/vite-plus-test@latest
overrides:
  vite: "catalog:"
  vitest: "catalog:"
```

两点值得注意：

1. **`vite` 不是 Vite。** 它被别名指向 `@voidzero-dev/vite-plus-core` — Voidzero 的 “Vite Plus” 发行版。所有从 `vite` 导入的代码实际加载的是 vite-plus。`overrides` 段把这个别名延伸到所有间接依赖。
2. **新增或升级共享依赖** 只需要改 `pnpm-workspace.yaml` 一行。每个 App 在自己的 `package.json` 里写 `"react": "catalog:"` 即可对齐。

### 什么是 vite-plus？

vite-plus 是 Voidzero 发行的 Vite 超集，提供：

- **`vp` CLI**，把 `dev`、`build`、`check`、`fmt`、`lint` 整合在一起。`apps/admin` 与 `apps/web` 都用 `vp dev` / `vp build` 替代原生 `vite`。
- **Rolldown** 作为打包器，加速生产构建。
- **OXC** 提供 lint 与格式化能力。

由于 API 兼容标准 Vite，`@vitejs/plugin-react`、`@tailwindcss/vite` 等插件可以原样工作。

## 共享工具（`@ecoctrl/shared`）

`packages/shared` 暴露：

- **Zod schema**（`types/api/`）— 服务端用来校验请求/响应，前端用来生成类型安全的 fetch 客户端。共享同一份 `z.infer` 类型，确保协议不会偏移。
- **`createDevProxy(apiBaseUrl, options?)`** — 返回一个 Vite `server.proxy` 配置，在 URL 是 `localhost` 时把 `/api` 与 `/static` 转发到 API。生产环境的重写交给反向代理处理。
- **`resolveUiAlias()`** — 一个 Vite 插件，跨包修正 `@/` 别名（见下文）。
- **`viteConfig`** — 各前端 App 的默认基础配置，预装 TailwindCSS、import 排序、lint、format、类型检查等。

## `@ecoctrl/ui` — 源码分发

大多数工作区 UI 库都会发布编译过的 `dist/`。`@ecoctrl/ui` **不会**：

```jsonc
// packages/ui/package.json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./index.css": "./src/index.css"
  }
}
```

库导出 `cn`、`ThemeProvider`，以及一组基于 [Base UI](https://base-ui.com/) 的 shadcn 风格组件。它们以 TypeScript 源码形式被 import，并由每个消费 App 的打包器统一打包。

### 为什么需要一个 Vite 插件

当 `apps/admin/src/somewhere.tsx` 从 `@ecoctrl/ui` 导入时，源码里仍有诸如 `@/lib/utils` 之类的相对别名。从 admin 的角度看，`@` 指向 admin 自己的 `src/`，而不是 ui 包。`@ecoctrl/shared` 中的 `resolveUiAlias()` 插件会把这些别名重写到 ui 包自己的 `src/`，并显式尝试每种 TypeScript 扩展名（Rolldown 在生产构建时不会自动尝试扩展名）。`apps/admin` 与 `apps/web` 的 `vite.config.ts` 中已经包含该插件。

实际带来的便利：**只要修改 `packages/ui` 的源码，每个消费 App 在下次刷新时就能看到效果，无需任何构建步骤。**

## 服务端构建：Rolldown 自动产出 `dist/package.json`

`packages/server` 由 [Rolldown](https://rolldown.rs/) 打包。它的 `rolldown.config.ts` 把所有 bare specifier 与 Node 内置模块都标为外部依赖，因此最终的 `dist/index.mjs` 只是一个轻量入口，运行时仍然 import `node_modules/`。

一个自定义插件会扫描 bundle 用到的外部 import，从源 `package.json` 中查找版本并写出新的 `dist/package.json`，仅列出真正使用的运行时依赖。release zip 中的服务端因此自包含，部署到任何主机只需 `pnpm install --prod`。

## 使用 Changesets 管理版本

仓库使用 [Changesets](https://github.com/changesets/changesets) 管理版本。两个配置项需要了解：

- **Fixed 包**：`@ecoctrl/admin`、`@ecoctrl/web` 与 `@ecoctrl/server` 共享同一个版本号 — 任意一个升级都会带动另外两个一起升级。release zip 文件名也由这个共享版本决定。
- **Ignored 包**：`@ecoctrl/ui` 与 `@ecoctrl/shared` 不参与版本管理，跟随消费它们的 App 持续演进。

提交带有用户可见变更的 PR 之前，先创建一个 changeset：

```bash
pnpm changeset
# 选择受影响的包，描述变更，提交生成的 markdown 文件。
```

发布工作流（见 [部署指南](/zh/reference/deployment)）会自动完成版本号升级、changelog 生成与 release 发布。

## 路径别名速查

| App | 别名 | 解析到 |
|---|---|---|
| `apps/admin` | `@/` | `apps/admin/src/` |
| `apps/web` | `~/` | `apps/web/app/` |
| `apps/web` | `~/components/ui` | `apps/web/app/components/ui`（web 项目本地的 shadcn 副本） |
| `packages/server` | `@/` | `packages/server/src/` |

如果你在 `@ecoctrl/ui` 源码里看到 `@/`，那正是 `resolveUiAlias()` 处理的场景，请保持原样。
