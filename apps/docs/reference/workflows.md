# Workflow Engine

EcoCtrl ships with a built-in workflow engine that lets you automate business logic through a visual node graph. Workflows are defined in a JSON DSL, edited in the admin dashboard, and executed by a runtime interpreter in `packages/server/src/engine/`.

## Overview

A workflow consists of three parts:

1. **Trigger** — decides when the workflow runs.
2. **Nodes** — the steps to execute, arranged as a directed graph.
3. **Edges** — connections between nodes that define execution order.

The engine executes nodes sequentially while maintaining an `ExecutionContext` that holds variables, node outputs and environment values.

## Trigger types

| Type           | Description                                                     | Config                                             |
| -------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `state_change` | Fires when watched data changes                                 | `watch: string[]`, optional `condition` expression |
| `schedule`     | Cron-based recurring execution                                  | `cron: string`, `timezone: string`                 |
| `manual`       | Triggered by `POST /api/workflows/:id/trigger`                  | —                                                  |
| `webhook`      | Triggered by `POST /api/webhook` with the workflow's webhook ID | `secret`, `allowedIps`                             |
| `event`        | Fires on a named internal event                                 | `event: string`, optional `condition`              |

Schedule triggers are backed by the pg-boss queue system. When a workflow is created or updated with a schedule trigger, a corresponding cron job is registered (or unregistered) automatically.

## Node types

### Control nodes

| Node        | Purpose                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `start`     | Entry point. Every workflow has exactly one.                                                                             |
| `end`       | Terminal node. Stops execution.                                                                                          |
| `condition` | Evaluates a boolean expression (`expr.ts`). Follows the "true" edge if the condition is met, otherwise the "false" edge. |
| `switch`    | Like `condition` but with multiple output branches.                                                                      |
| `loop`      | Iterates over a collection, executing the connected subgraph for each item.                                              |
| `parallel`  | Executes multiple downstream branches concurrently.                                                                      |
| `delay`     | Pauses execution for a configured duration.                                                                              |

### Action nodes

| Node           | Purpose                                        | Config highlights                                                     |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| `http_request` | Makes an outbound HTTP call.                   | `method`, `url`, `headers`, `body` (supports template interpolation). |
| `database`     | Runs a SQL query against the EcoCtrl database. | `query`, `params`.                                                    |
| `email`        | Sends an email via the configured SMTP relay.  | `to`, `subject`, `body`.                                              |
| `variable`     | Sets or mutates a workflow variable.           | `name`, `value` (supports expressions).                               |

## Error handling

Every node can declare an `onError` handler:

| Action  | Behavior                                                                        |
| ------- | ------------------------------------------------------------------------------- |
| `retry` | Re-runs the node up to `retryCount` times with `retryDelayMs` between attempts. |
| `skip`  | Marks the node as skipped and continues to the next connected node.             |
| `abort` | Fails the entire workflow execution.                                            |
| `goto`  | Jumps to the node identified by `gotoNodeId`. Useful for fallback paths.        |

## Execution model

```
Trigger fires
    │
    ▼
Executor creates ExecutionContext
    │
    ▼
For each node in topological order:
    - Resolve inputs (template interpolation, variable substitution)
    - Run the node handler
    - Store output in nodeOutputs map
    - Follow the matching edge to the next node
    │
    ▼
Execution ends → persist result to workflow_executions table
```

The `ExecutionContext` contains:

- `triggerData` — payload that fired the trigger
- `variables` — mutable Map of user-defined variables
- `nodeOutputs` — Map of each node's output record
- `env` — process environment variables

## Admin UI

The admin dashboard provides a visual workflow editor at `WorkflowCanvas.tsx` (powered by `@xyflow/react`). Users can:

- Drag nodes from a palette onto the canvas.
- Connect nodes with edges.
- Configure each node's properties in a side panel.
- Test-run workflows directly from the editor.

Workflow definitions are auto-saved to the `workflows` table as the JSON DSL.

## API

| Method | Path                            | Description              |
| ------ | ------------------------------- | ------------------------ |
| GET    | `/api/workflows`                | List workflows           |
| POST   | `/api/workflows`                | Create workflow          |
| GET    | `/api/workflows/:id`            | Get workflow DSL         |
| PUT    | `/api/workflows/:id`            | Update workflow          |
| DELETE | `/api/workflows/:id`            | Delete workflow          |
| POST   | `/api/workflows/:id/trigger`    | Manual execution         |
| GET    | `/api/workflows/:id/executions` | Execution history        |
| POST   | `/api/webhook/:slug`            | Webhook trigger (public) |

## Adding a custom node

1. Add the node type to `NodeType` in `engine/types.ts`.
2. Implement the handler in `executor.ts`.
3. Add the UI component in the admin workflow editor palette.
4. Update the validator to accept the new node's config schema.
