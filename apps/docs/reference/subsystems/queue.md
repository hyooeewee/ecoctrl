---
title: 任务队列系统
description: pg-boss 架构、任务调度模型、Worker 注册、重试与死信策略
---

# 任务队列系统

EcoCtrl 使用 [pg-boss](https://github.com/timgit/pg-boss) 实现可靠的后台任务处理。所有任务存储在 PostgreSQL 中，由运行在 API 服务同一进程中的 Worker 消费。

## 架构

```
API 请求或定时触发器
        │
        ▼
  boss.send('queue-name', payload)
        │
        ▼
  pg-boss (PostgreSQL 表)
   ─ pg boss.job （待处理任务）
   ─ pg boss.archive （已完成任务归档）
        │
        ▼
  Worker 轮询 → 执行 handler → 更新状态
        │
        ▼
  完成 / 失败（重试或死信）
```

pg-boss 直接使用 Fastify 所在的 PostgreSQL 数据库连接，不需要独立的队列基础设施。任务元数据和状态都存储在数据库的 `pgboss` schema 下，简化了运维复杂度。

## 初始化

队列系统通过 `queue/pgboss.ts` 初始化：

```typescript
import PgBoss from "pg-boss";

const boss = new PgBoss({
  schema: "pgboss", // 独立 schema 避免表名冲突
  connectionString: DATABASE_URL,
});

await boss.start();
```

关键初始化参数：

| 参数                  | 说明                            |
| --------------------- | ------------------------------- |
| `schema`              | 独立 schema 名称，默认 `pgboss` |
| `connectionString`    | PostgreSQL 连接字符串           |
| `pollIntervalSeconds` | 轮询新任务间隔（默认 2 秒）     |
| `retentionDays`       | 完成任务保留天数（默认 30 天）  |

## 任务类型

| 任务       | 队列名               | 说明                      |
| ---------- | -------------------- | ------------------------- |
| 报表生成   | `report-generation`  | 异步生成 PDF/CSV 能耗报表 |
| 数据库备份 | `backup`             | 定时备份数据库到存储      |
| 工作流执行 | `workflow-execution` | 执行工作流 DSL 定义的任务 |

### 发送任务

```typescript
await boss.send(
  "report-generation",
  {
    reportId: "rpt_123",
    format: "pdf",
    userId: "user_456",
  },
  {
    retryLimit: 3,
    retryDelay: 60, // 秒
  },
);
```

## Worker

Worker 在 `queue/worker.ts` 中注册：

```typescript
import { getWorker } from "./queue/pgboss";

const worker = await getWorker();

// 注册报表生成处理器
await worker.work("report-generation", async (job) => {
  const { reportId, format } = job.data;
  // 执行报表生成...
});
```

### 运行模式

- **同一 Node.js 进程中运行**（不独立部署）
- 开发环境自动启动（伴随 API 服务）
- 生产环境同进程运行
- 支持优雅关闭（监听 SIGTERM 信号完成当前任务后退出）

## 重试与死信

### 指数退避

任务失败后按指数增长间隔重试：

- 第 1 次重试：60 秒后
- 第 2 次重试：120 秒后
- 第 3 次重试：240 秒后
- ...

退避公式：`retryDelay * 2^(attempt - 1)`，默认初始延迟 60 秒。

### 死信策略

| 条件             | 行为                                                    |
| ---------------- | ------------------------------------------------------- |
| 重试次数未达上限 | 按指数退避重新排队                                      |
| 达到最大重试次数 | 任务标记为 `failed` 进入死信状态                        |
| 死信任务         | 保留在 `pgboss.job` 表中，状态为 `failed`，可供人工审查 |
| 手动重新排队     | 通过 pg-boss API 或 SQL 可将死信重新加入队列            |

### 死信重入

```sql
-- 查看死信任务
SELECT * FROM pgboss.job WHERE state = 'failed';

-- 手动重新排队（设置新状态为 created）
UPDATE pgboss.job SET state = 'created' WHERE id = 123;
```

## 监控

通过 pg-boss 内置表监控队列状态：

| 表                | 内容                                   |
| ----------------- | -------------------------------------- |
| `pgboss.job`      | 所有任务记录（含待处理、运行中、失败） |
| `pgboss.archive`  | 已完成任务归档                         |
| `pgboss.schedule` | 定时任务配置                           |

### 常用监控查询

```sql
-- 各队列待处理任务数
SELECT name, COUNT(*) FROM pgboss.job
WHERE state = 'created' GROUP BY name;

-- 最近失败的报表生成任务
SELECT * FROM pgboss.job
WHERE name = 'report-generation' AND state = 'failed'
ORDER BY created_on DESC LIMIT 10;
```

## 相关文件

- `packages/server/src/queue/pgboss.ts` — pg-boss 初始化与配置
- `packages/server/src/queue/worker.ts` — Worker 注册与处理器
- `packages/server/src/queue/types.ts` — 任务相关类型定义
