# 工作流引擎

EcoCtrl 内置了一套工作流引擎，允许你通过可视化节点图来自动化业务逻辑。工作流以 JSON DSL 定义，在 admin 后台编辑，并由 `packages/server/src/engine/` 中的运行时解释器执行。

## 概述

一个工作流由三部分组成：

1. **触发器** — 决定工作流何时运行。
2. **节点** — 要执行的步骤，以有向图排列。
3. **边** — 节点之间的连接，定义执行顺序。

引擎按拓扑顺序依次执行节点，同时维护一个 `ExecutionContext`，保存变量、节点输出和环境值。

## 触发器类型

| 类型           | 说明                                            | 配置                                       |
| -------------- | ----------------------------------------------- | ------------------------------------------ |
| `state_change` | 监视数据变化时触发                              | `watch: string[]`，可选 `condition` 表达式 |
| `schedule`     | 基于 Cron 的定时执行                            | `cron: string`，`timezone: string`         |
| `manual`       | 通过 `POST /api/workflows/:id/trigger` 手动触发 | —                                          |
| `webhook`      | 通过 `POST /api/webhook` 触发                   | `secret`、`allowedIps`                     |
| `event`        | 命名内部事件触发                                | `event: string`，可选 `condition`          |

定时触发器由 pg-boss 队列系统支持。创建工作流或更新其定时触发器时，系统会自动注册（或注销）对应的 Cron 任务。

## 节点类型

### 控制节点

| 节点        | 用途                                                                 |
| ----------- | -------------------------------------------------------------------- |
| `start`     | 入口点。每个工作流必须有且只有一个。                                 |
| `end`       | 终止节点。停止执行。                                                 |
| `condition` | 评估布尔表达式（`expr.ts`）。条件为真时走"true"边，否则走"false"边。 |
| `switch`    | 类似 `condition`，但支持多个输出分支。                               |
| `loop`      | 遍历集合，为每一项执行连接的子图。                                   |
| `parallel`  | 并发执行多个下游分支。                                               |
| `delay`     | 暂停执行指定时长。                                                   |

### 动作节点

| 节点           | 用途                             | 配置要点                                             |
| -------------- | -------------------------------- | ---------------------------------------------------- |
| `http_request` | 发起外部 HTTP 调用。             | `method`、`url`、`headers`、`body`（支持模板插值）。 |
| `database`     | 对 EcoCtrl 数据库执行 SQL 查询。 | `query`、`params`。                                  |
| `email`        | 通过配置的 SMTP 中继发送邮件。   | `to`、`subject`、`body`。                            |
| `variable`     | 设置或修改变量。                 | `name`、`value`（支持表达式）。                      |

## 错误处理

每个节点可以声明 `onError` 处理器：

| 动作    | 行为                                             |
| ------- | ------------------------------------------------ |
| `retry` | 最多重试 `retryCount` 次，间隔 `retryDelayMs`。  |
| `skip`  | 标记节点为跳过，继续执行下一个连接节点。         |
| `abort` | 整个工作流执行失败。                             |
| `goto`  | 跳转到 `gotoNodeId` 指定的节点。适用于回退路径。 |

## 执行模型

```
触发器触发
    │
    ▼
执行器创建 ExecutionContext
    │
    ▼
按拓扑顺序遍历每个节点：
    - 解析输入（模板插值、变量替换）
    - 运行节点处理器
    - 将输出存入 nodeOutputs 映射
    - 沿匹配的边进入下一个节点
    │
    ▼
执行结束 → 将结果持久化到 workflow_executions 表
```

`ExecutionContext` 包含：

- `triggerData` — 触发器触发时的载荷
- `variables` — 用户定义的变量（可变 Map）
- `nodeOutputs` — 每个节点的输出记录（Map）
- `env` — 进程环境变量

## Admin UI

admin 后台提供了一个可视化工作流编辑器 `WorkflowCanvas.tsx`（基于 `@xyflow/react`）。用户可以：

- 从面板拖拽节点到画布。
- 用边连接节点。
- 在侧边面板配置每个节点的属性。
- 直接从编辑器测试运行工作流。

工作流定义会自动以 JSON DSL 形式保存到 `workflows` 表。

## API

| 方法   | 路径                            | 说明                 |
| ------ | ------------------------------- | -------------------- |
| GET    | `/api/workflows`                | 列出工作流           |
| POST   | `/api/workflows`                | 创建工作流           |
| GET    | `/api/workflows/:id`            | 获取工作流 DSL       |
| PUT    | `/api/workflows/:id`            | 更新工作流           |
| DELETE | `/api/workflows/:id`            | 删除工作流           |
| POST   | `/api/workflows/:id/trigger`    | 手动执行             |
| GET    | `/api/workflows/:id/executions` | 执行历史             |
| POST   | `/api/webhook/:slug`            | Webhook 触发（公开） |

## 添加自定义节点

1. 在 `engine/types.ts` 的 `NodeType` 中添加节点类型。
2. 在 `executor.ts` 中实现处理器。
3. 在 admin 工作流编辑器的面板中添加 UI 组件。
4. 更新验证器以接受新节点的配置 schema。
