# 队列与 Worker

EcoCtrl 使用 [pg-boss](https://github.com/timgit/pg-boss) 实现可靠的后台任务处理。任务存储在 PostgreSQL 中，由运行在 API 服务器同一 Node 进程中的 Worker 消费。

## 架构

```
API 请求或定时触发器
        │
        ▼
   boss.send('queue-name', payload)
        │
        ▼
   PostgreSQL (pg-boss 表)
        │
        ▼
   Worker 轮询并取回任务
        │
        ▼
   处理器执行
        │
        ▼
   任务标记为完成 / 失败 / 重试
```

## 队列初始化

`packages/server/src/queue/pgboss.ts` 使用与应用程序其余部分相同的数据库连接池创建单个 pg-boss 实例：

```ts
import { getDb } from "@/plugins/database";
import PgBoss from "pg-boss";

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  // ...其他选项
});
```

实例在服务器启动时启动，并在收到 `SIGTERM` 时优雅关闭。

## Worker 注册

`packages/server/src/queue/worker.ts` 为每个队列注册任务处理器：

| 队列                 | 处理器                    | 说明                               |
| -------------------- | ------------------------- | ---------------------------------- |
| `report-generation`  | `handleReportGeneration`  | 根据模板生成定时报表。             |
| `backup-task`        | `handleBackupTask`        | 执行数据库备份并上传到配置的存储。 |
| `workflow-execution` | `handleWorkflowExecution` | 通过引擎执行器运行工作流 DSL。     |

处理器签名示例：

```ts
async function handleReportGeneration(job: PgBoss.Job) {
  const { planId, format } = job.data;
  // ...生成报表...
  return { fileUrl, size };
}
```

## 入队任务

在服务器代码的任意位置：

```ts
import { boss } from "@/queue/pgboss";

await boss.send("report-generation", {
  planId: "uuid",
  format: "pdf",
});
```

对于基于定时的工作，pg-boss 支持 Cron 语法：

```ts
await boss.schedule("daily-report", "0 9 * * *", {
  planId: "uuid",
});
```

## 重试与死信

失败的任务会以指数退避重试：

- 默认最大重试次数：5
- 基础延迟：15 秒
- 最大延迟：1 小时

重试耗尽后，任务会被移动到 `pg-boss.archive` 表（死信队列）。你可以直接在 PostgreSQL 中查询以进行调试。

## 监控

pg-boss 暴露了内部状态表。常用诊断查询：

```sql
-- 待处理任务
SELECT name, state, COUNT(*) FROM pgboss.job
WHERE state = 'created' GROUP BY name, state;

-- 最近一小时失败的任务
SELECT name, data, output FROM pgboss.job
WHERE state = 'failed' AND createdon > NOW() - INTERVAL '1 hour';
```

## 开发环境与生产环境

- **开发环境**：Worker 在 `pnpm dev:server` 启动时自动启动。任务在同一线程内运行。
- **生产环境**：Worker 与 API 运行在同一容器中。如需水平扩展，可以在单独的容器中运行 Worker，使用相同的 `packages/server` 镜像但指定不同的入口点（`node dist/queue/worker.js`）。
