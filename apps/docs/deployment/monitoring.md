---
title: 监控与日志
description: SSE 心跳监控、Mock Fallback 告警、pino 日志解读
---

# 监控与日志

EcoCtrl 提供多层次的运行状态监控和结构化日志输出，帮助运维团队及时发现和处理异常。

## SSE 实时连接监控

服务端使用 Server-Sent Events (SSE) 向已认证的客户端推送实时数据。

### 心跳机制

每个 SSE 连接以 30 秒间隔发送心跳信号：

```javascript
// packages/server/src/routes/events.ts
const HEARTBEAT_INTERVAL_MS = 30000; // 30 秒

const heartbeat = setInterval(() => {
  reply.raw.write(":ping\n\n"); // SSE 心跳注释
}, HEARTBEAT_INTERVAL_MS);
```

心跳是标准的 SSE 注释行（以 `:` 开头），客户端可以通过监听 `onopen` 和检测心跳超时判断连接状态。

### 连接生命周期

| 阶段      | 触发时机                                   | 日志事件                                                       |
| --------- | ------------------------------------------ | -------------------------------------------------------------- |
| 连接建立  | 客户端 `GET /api/events?token=<sse-token>` | `SSE connection <id> opened for user <userId>`                 |
| 首次 ping | 连接建立后立即                             | 客户端收到 `{"type":"ping","payload":{"message":"connected"}}` |
| 定期心跳  | 每 30 秒                                   | `:ping\n\n`                                                    |
| 连接关闭  | 客户端断开或心跳写入失败                   | `SSE connection <id> closed`                                   |

### 监控 SSE 连接状态

```bash
# 查看当前连接的 SSE 连接数（通过日志统计）
docker compose logs server | grep "SSE connection" | grep "opened" | wc -l

# 监控连接断开异常
docker compose logs server --tail 100 | grep "SSE connection.*closed"
```

### SSE 连接令牌

SSE 使用短寿命 JWT（30 秒过期）进行认证：

- 客户端通过 `POST /api/events/token` 获取令牌
- 令牌仅限 SSE 连接使用（`purpose: "sse"`）
- 连接建立后再无额外认证开销

<!-- 浏览器 Network 面板中的 SSE EventStream 记录 -->

## 照明控制 Mock Fallback 告警

照明控制模块在 IoT 服务不可用时会自动降级到 Mock 模式——使用进程内内存存储替代真实的 BACnet 设备点状态。

### 触发条件

```typescript
// packages/server/src/routes/lighting.ts
try {
  const raw = await readPointValues(pointIds);
  return parseIotResponse(raw);
} catch (err) {
  console.warn("[lighting] IoT read failed, using mock fallback:", (err as Error).message);
  // 返回 mock 值
}
```

### 告警信号

当控制台输出以下日志时，表示 IoT 服务异常：

```
[warn] [lighting] IoT read failed, using mock fallback: <error message>
[warn] [lighting] IoT write failed, using mock fallback: <error message>
```

### 应对措施

| 步骤 | 操作                                                       |
| ---- | ---------------------------------------------------------- |
| 1    | 检查 IoT 网关服务状态（`ping <BASE_URL>`）                 |
| 2    | 检查 `BASE_URL` / `APP_ID` 环境变量配置                    |
| 3    | 确认 IoT 令牌缓存未过期                                    |
| 4    | 查看 `docker compose logs server \| grep iot` 获取详细错误 |

## pg-boss 任务队列监控

后台任务通过 pg-boss 管理，所有任务在 PostgreSQL 的 `pgboss.*` 表中持久化。

### 检查队列深度

```sql
-- 连接到数据库后查询
SELECT name, state, count(*)
FROM pgboss.job
GROUP BY name, state
ORDER BY name, state;
```

### 队列状态说明

| 状态        | 说明                   | 需关注 |
| ----------- | ---------------------- | ------ |
| `created`   | 已创建等待处理         | 正常   |
| `active`    | 正在处理中             | 正常   |
| `completed` | 已完成                 | 正常   |
| `failed`    | 已失败（超过重试次数） | **是** |
| `expired`   | 超时未完成             | **是** |
| `cancelled` | 已取消                 | 否     |

### 监控队列积压

```bash
# 直接通过 docker 查询
docker compose exec postgres psql -U ecoctrl -d ecoctrl -c "
  SELECT state, count(*) as count
  FROM pgboss.job
  WHERE name = 'workflow.execute'
  GROUP BY state;
"
```

大量 `created` 任务堆积或 `failed` 任务持续出现时，需要检查 Worker 进程和队列配置。

<!-- `psql` 查询 pgboss.job 的输出示例 -->

## pino JSON 日志

服务端使用 pino 日志框架，所有日志以 **JSON on stdout** 格式输出，可直接对接各种日志聚合系统。

### 日志级别

```env
# .env.local 配置
LOG_LEVEL=info           # debug | info | warn | error
LOG_DESTINATION=stdout   # stdout | file | both
LOG_DIR=./logs           # 文件模式时的日志目录
LOG_PRETTY=true          # 仅开发模式有效
```

### 日志格式示例

```json
{"level":30,"time":1704067200000,"pid":1,"hostname":"abc123","name":"sse","msg":"SSE connection abc-123 opened for user 42"}
{"level":40,"time":1704067260000,"pid":1,"hostname":"abc123","name":"lighting","msg":"[lighting] IoT read failed, using mock fallback: connect ECONNREFUSED"}
{"level":50,"time":1704067320000,"pid":1,"hostname":"abc123","name":"queue","msg":"[pg-boss] connection error","err":{"message":"..."}}
```

| Level 值 | 级别  | 说明                             |
| -------- | ----- | -------------------------------- |
| 30       | INFO  | 常规运行状态                     |
| 40       | WARN  | 可恢复的异常（如 Mock Fallback） |
| 50       | ERROR | 需要人工关注的问题               |

### 日志聚合方案

标准 JSON-on-stdout 格式可与以下系统无缝对接：

| 方案       | 接入方式                                       |
| ---------- | ---------------------------------------------- |
| Loki       | 使用 Promtail 或 Docker 日志驱动采集           |
| ELK        | 使用 Filebeat 或 Logstash 采集容器 stdout      |
| Datadog    | 使用 Datadog Agent 自动采集 Docker 日志        |
| Papertrail | 配置 Docker 日志驱动 `--log-driver syslog`     |
| 自建       | 直接 `docker compose logs -f` 定向到文件或管道 |

### 日志轮转

当 `LOG_DESTINATION=file` 时：

```env
LOG_ROTATE_INTERVAL=1d    # 日志轮转间隔（1d / 7d / 1h）
LOG_MAX_DAYS=30           # 日志保留天数
```

日志文件位于容器 `./logs` 目录，通过 Docker 卷映射到宿主机 `docker/ecoctrl/server_logs/`。

## 健康检查端点

| 端点                       | 方法 | 说明                            |
| -------------------------- | ---- | ------------------------------- |
| `/health`                  | GET  | 服务存活检查（返回 200 OK）     |
| `/api/configs/verify-smtp` | POST | SMTP 连接验证（详见 SMTP 配置） |

健康检查由 Docker Compose 的 `healthcheck` 自动调用：

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 30s
```
