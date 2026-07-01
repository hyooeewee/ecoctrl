---
title: 工作流引擎
description: 引擎架构、DSL 结构、插件系统（5 层）、4 种触发器类型、DAG 执行模型、节点类型
---

# 工作流引擎

工作流引擎是 EcoCtrl 的核心编排子系统，位于 `packages/server/src/engine/`，共 **16 个源文件**，负责执行 JSON DSL 定义的工作流 DAG。引擎按拓扑顺序依次执行节点，维护 `ExecutionContext` 上下文。Admin 后台提供基于 `@xyflow/react` 的可视化编辑器。

## 引擎文件结构

```
engine/
├── types.ts               # 核心类型：WorkflowDSL、WorkflowNode、WorkflowEdge、ExecutionContext
├── validator.ts           # DSL 结构校验（节点 ID、边连通性、必填字段）
├── executor.ts            # 主执行器 — 顺序执行 DAG
├── trigger.ts             # 触发器匹配逻辑（判断是否应触发）
├── expr.ts                # 轻量级表达式求值器（条件和变量插值）
├── template.ts            # 字符串模板引擎（HTTP 请求体、邮件主题等）
├── scheduler.ts           # 定时调度（连接 pg-boss cron 注册/注销）
├── sub-graph.ts           # 子图执行（loop、parallel 等控制节点的子图运行）
├── upstream-resolver.ts   # 上游依赖解析
├── env-utils.ts           # 环境变量工具函数
│
├── plugin-api.ts          # 插件 API 定义（提供给插件的所有能力接口）
├── plugin-types.ts        # 插件类型定义（Manifest、Definition、ExecutionContext 等）
├── plugin-loader.ts       # 插件加载器
├── plugin-registry.ts     # 插件注册中心
├── plugin-sandbox.ts      # 插件沙箱（安全隔离）
└── plugin-executor.ts     # 插件执行器
```

## DSL 结构

工作流以 JSON DSL 定义，版本 `"1.0"`：

```typescript
interface WorkflowDSL {
  version: "1.0";
  nodes: WorkflowNode[]; // 节点列表
  edges: WorkflowEdge[]; // 边列表
  envVars?: Array<{
    // 环境变量定义（可选）
    key: string;
    value: unknown;
    type: "string" | "number" | "secret" | "boolean";
    description?: string;
  }>;
  settings?: WorkflowSettings; // 自动保存等设置
}
```

### WorkflowNode

```typescript
interface WorkflowNode {
  id: string;
  type: string; // 节点类型标识
  name: string;
  config: Record<string, unknown>; // 节点专属配置
  onError?: ErrorHandler; // 错误处理器
  position?: { x: number; y: number }; // 画布位置
}
```

### WorkflowEdge

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // 用于 condition/switch 条件分支
  targetHandle?: string;
  label?: string;
}
```

## 触发器类型

| 类型       | 触发方式                               | 配置参数                                   |
| ---------- | -------------------------------------- | ------------------------------------------ |
| `manual`   | 调用 `POST /api/workflows/:id/trigger` | 无                                         |
| `schedule` | 基于 Cron 的定时执行                   | `cron: string`、`timezone: string`         |
| `webhook`  | 调用 `POST /api/webhook/:slug`         | `secret?: string`、`allowedIps?: string[]` |
| `event`    | 系统内部命名事件                       | `event: string`、`condition?: string`      |

定时触发器通过 pg-boss 调度：创建/更新工作流时自动注册（或注销）对应的 Cron 任务。

## 节点类型

### 控制节点

| 节点        | 用途     | 说明                                    |
| ----------- | -------- | --------------------------------------- |
| `start`     | 入口点   | 每个工作流必须有且只有一个              |
| `end`       | 终止节点 | 停止工作流执行                          |
| `condition` | 条件分支 | 评估布尔表达式，走 `true` 或 `false` 边 |
| `switch`    | 多路分支 | 支持多个输出标签                        |
| `loop`      | 循环     | 遍历集合，为每项执行子图                |
| `parallel`  | 并行     | 并发执行多个下游分支                    |
| `delay`     | 延迟     | 暂停指定毫秒数                          |

### 动作节点

| 节点           | 用途           | 配置要点                                           |
| -------------- | -------------- | -------------------------------------------------- |
| `http_request` | 发起 HTTP 调用 | `method`、`url`、`headers`、`body`（支持模板插值） |
| `database`     | 执行 SQL 查询  | `query`、`params`                                  |
| `email`        | 发送邮件       | `to`、`subject`、`body`                            |
| `variable`     | 设置变量       | `name`、`value`（支持表达式）                      |

## 执行模型

```
触发器触发
    │
    ▼
Executor 创建 ExecutionContext：
  - triggerData（触发载荷）
  - variables（可变 Map）
  - nodeOutputs（节点输出记录）
  - env（进程环境变量）
  - secrets（敏感配置）
    │
    ▼
按拓扑顺序遍历 DAG：
  - 解析节点输入（模板插值、变量替换）
  - 运行节点处理器
  - 将输出存入 nodeOutputs
  - 沿匹配的边进入下一个节点
    │
    ▼
执行结束 → 持久化到 workflow_executions 表
```

## 错误处理

每个节点可声明 `onError` 处理器：

| 策略    | 行为                                               |
| ------- | -------------------------------------------------- |
| `retry` | 最多重试 `retryCount` 次，间隔 `retryDelayMs` 毫秒 |
| `skip`  | 标记为跳过，继续执行下一个连接节点                 |
| `abort` | 整个工作流执行失败                                 |
| `goto`  | 跳转到 `gotoNodeId` 指定的节点（可用于回退路径）   |

## 插件系统（5 层架构）

| 层次   | 文件                 | 职责                                                          |
| ------ | -------------------- | ------------------------------------------------------------- |
| API 层 | `plugin-api.ts`      | 定义插件可用的所有能力接口（HTTP、IoT、DB、Log、SSE、Env 等） |
| 加载层 | `plugin-loader.ts`   | 从存储加载插件的代码 + schema                                 |
| 注册层 | `plugin-registry.ts` | 管理插件版本、依赖、生命周期                                  |
| 沙箱层 | `plugin-sandbox.ts`  | 安全隔离插件运行时环境                                        |
| 执行层 | `plugin-executor.ts` | 将插件作为工作流节点执行                                      |

### Plugin API

插件可访问的能力接口（`PluginApi`）包括：

```typescript
interface PluginApi {
  variables: { get, set, delete, all };
  http: { get, post, put, patch, delete };
  iot: { readPoint, readPoints, writePoint, writePoints, ... };
  notify: { send, sendMail };
  log: { info, warn, error };
  env: { get };
  context: { workflowId, executionId, triggerData, nodeId, nodeName };
  utils: { sleep };
  expr: { evaluateBoolean, evaluateExpression };
  db: { execute };
  sse: { emit };
  workflow: { executeSubGraph, executeById };
}
```

### PluginManifest

每个插件定义 `PluginManifest`：

```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  category: "trigger" | "action" | "condition";
  description?: string;
  entry: string; // 代码入口
  schema: string; // 配置 Schema
  minEngineVersion?: string;
  aliases?: string[];
}
```
