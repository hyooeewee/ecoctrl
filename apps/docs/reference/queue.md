# Queue & Worker

EcoCtrl uses [pg-boss](https://github.com/timgit/pg-boss) for reliable background job processing. Jobs are stored in PostgreSQL and processed by a worker that runs in the same Node process as the API server.

## Architecture

```
API request or schedule trigger
        │
        ▼
   boss.send('queue-name', payload)
        │
        ▼
   PostgreSQL (pg-boss tables)
        │
        ▼
   Worker polls and picks up job
        │
        ▼
   Handler executes
        │
        ▼
   Job marked completed / failed / retried
```

## Queue initialization

`packages/server/src/queue/pgboss.ts` creates a single pg-boss instance using the same database connection pool as the rest of the application:

```ts
import { getDb } from "@/plugins/database";
import PgBoss from "pg-boss";

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  // ...other options
});
```

The instance is started during server bootstrap and shut down gracefully on `SIGTERM`.

## Worker registration

`packages/server/src/queue/worker.ts` registers job handlers for each queue:

| Queue                | Handler                   | Description                                                 |
| -------------------- | ------------------------- | ----------------------------------------------------------- |
| `report-generation`  | `handleReportGeneration`  | Generates scheduled reports from templates.                 |
| `backup-task`        | `handleBackupTask`        | Executes database backup and uploads to configured storage. |
| `workflow-execution` | `handleWorkflowExecution` | Runs a workflow DSL through the engine executor.            |

Example handler shape:

```ts
async function handleReportGeneration(job: PgBoss.Job) {
  const { planId, format } = job.data;
  // ...generate report...
  return { fileUrl, size };
}
```

## Enqueuing jobs

From anywhere in the server codebase:

```ts
import { boss } from "@/queue/pgboss";

await boss.send("report-generation", {
  planId: "uuid",
  format: "pdf",
});
```

For schedule-based work, pg-boss supports cron syntax:

```ts
await boss.schedule("daily-report", "0 9 * * *", {
  planId: "uuid",
});
```

## Retry and dead-letter

Failed jobs are retried with exponential backoff:

- Default max retries: 5
- Base delay: 15 seconds
- Max delay: 1 hour

After exhausting retries, the job is moved to the `pg-boss.archive` table (dead-letter queue). You can query it directly in PostgreSQL for debugging.

## Monitoring

pg-boss exposes an internal state table. Useful diagnostic queries:

```sql
-- Pending jobs
SELECT name, state, COUNT(*) FROM pgboss.job
WHERE state = 'created' GROUP BY name, state;

-- Failed jobs in the last hour
SELECT name, data, output FROM pgboss.job
WHERE state = 'failed' AND createdon > NOW() - INTERVAL '1 hour';
```

## Development vs production

- **Development**: the worker starts automatically when `pnpm dev:server` boots. Jobs run inline in the same process.
- **Production**: the worker runs alongside the API in the same container. If you need horizontal scaling, run the worker in a separate container using the same `packages/server` image but with a different entry point (`node dist/queue/worker.js`).
