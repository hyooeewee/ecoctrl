# packages/shared

EcoCtrl 跨应用共享的 TypeScript 包，提供统一的 tsconfig 配置模板和共享类型定义。

## 交互规则

- 任何编码或修改前，必须先输出执行计划。
- 计划需包含：
  - 涉及的文件列表（路径）。
  - 每个文件的拟操作（创建 / 修改 / 删除）。
- 输出计划后，明确请求确认（如："确认后开始执行。"）。
- 仅在收到 "确认""可以" 或 "执行" 后，方可动手。

## Stack

- **Language:** TypeScript (ESM)
- **Build:** 无构建步骤（纯类型 + 配置包）
- **Tooling:** vite-plus (提供 `UserConfig` 类型)

## Project Structure

```
config/
  tsconfig.base.json    # 基础 TS 配置 (strict, ES2022)
  tsconfig.app.json     # 前端应用 tsconfig 模板
  tsconfig.node.json    # Node.js 后端 tsconfig 模板
  vite.config.base.ts   # 共享的 vp 配置 (fmt, lint, staged)
scripts/
  gen-env-example.mjs   # 从 .env.local 生成 .env.example (支持 @secret / @example 注解)
  README.md             # 脚本使用说明
types/
  index.ts              # 类型统一导出
  api/
    user.ts             # 用户相关共享类型 (示例)
```

## Exports

通过 `package.json` 的 `exports` 字段暴露：

```json
{
  ".": "./index.ts",
  "./tsconfig.base.json": "./config/tsconfig.base.json",
  "./tsconfig.app.json": "./config/tsconfig.app.json",
  "./tsconfig.node.json": "./config/tsconfig.node.json",
  "./types": "./types/index.ts",
  "./types/*": "./types/*.ts"
}
```

使用方式：
- 其他包通过 `"@ecoctrl/shared": "workspace:*"` 依赖引用
- 配置继承：`"extends": "@ecoctrl/shared/tsconfig.base.json"`
- 类型导入：`import type { SomeType } from "@ecoctrl/shared/types"`

## 工作范围

- 仅修改 `packages/shared` 内文件；`packages/server`、`apps/*`、`.` 等其他目录只读并且积极获取最新的状态，如需修改请给出修改建议。
- **修改类型后需确保各消费包类型兼容**，必要时通知相关包进行同步更新。
