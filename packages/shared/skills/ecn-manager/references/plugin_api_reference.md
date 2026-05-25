# PluginApi Reference

The `api` object injected into every `backend.js` function.

## Variables

- `api.variables.get(key)` → `unknown`
- `api.variables.set(key, value)` → `void`
- `api.variables.delete(key)` → `void`
- `api.variables.all()` → `Record<string, unknown>`

## HTTP

- `api.http.get(url, options?)` → `Promise<HttpResponse>`
- `api.http.post(url, options?)` → `Promise<HttpResponse>`
- `api.http.put(url, options?)` → `Promise<HttpResponse>`
- `api.http.patch(url, options?)` → `Promise<HttpResponse>`
- `api.http.delete(url, options?)` → `Promise<HttpResponse>`

Options: `{ headers?, body?, timeout? }` (timeout max 30s)

## IoT

- `api.iot.readPoint(name)` → `Promise<unknown>`
- `api.iot.readPoints(names[])` → `Promise<Record<string, unknown>>`
- `api.iot.writePoint(name, values)` → `Promise<void>`

## Notify

- `api.notify.send({ title, content, level?, to? })` → `Promise<void>`
- `api.notify.sendMail({ to[], subject, body, bodyType? })` → `Promise<{ messageId, sent }>`

## Log

- `api.log.info(msg, meta?)`
- `api.log.warn(msg, meta?)`
- `api.log.error(msg, meta?)`

## Database

- `api.db.execute(operation, table, where?, data?, returning?)`
  - Allowed tables: `objects`, `energy_readings`, `alert_logs`, `workflow_executions`
  - Operations: `select`, `insert`, `update`, `delete`

## Expression

- `api.expr.evaluateBoolean(expression)` → `boolean`
- `api.expr.evaluateExpression(expression)` → `unknown`

## Workflow

- `api.workflow.executeSubGraph(nodes, edges)` → `Promise<Record<string, unknown>>`

## Context

- `api.context.workflowId`
- `api.context.executionId`
- `api.context.triggerData`
- `api.context.nodeId`
- `api.context.nodeName`

## Utilities

- `api.utils.sleep(ms)` → `Promise<void>`
- `api.env.get(key)` → `string | undefined` (allowed: `API_BASE_URL`, `NODE_ENV`, `APP_NAME`)
