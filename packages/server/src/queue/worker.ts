import { PgBoss, type Job } from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { workflowExecutions } from "@/schemas/workflows";
import { findWorkflowById } from "@/repositories/workflows";
import { executeWorkflow } from "@/engine/executor";
import { splitEnvVars, mergeServerEnv } from "@/engine/env-utils";
import { PluginRegistry } from "@/engine/plugin-registry";
import { getPluginStorage } from "@/storage";
import { getLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import { publishWorkflowExecution, publishWorkflowNodeStatus } from "@/lib/eventPublisher";
import type { ExecutionJobData } from "./pgboss";

const logger = getLogger("queue");

const JOB_NAME = "workflow.execute";

// Plugin registry for worker process (uses same storage as API server)
const pluginStorage = getPluginStorage();
const pluginRegistry = new PluginRegistry(pluginStorage);

function getEnvVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  if (env.SMTP_HOST) vars.SMTP_HOST = env.SMTP_HOST;
  if (env.SMTP_PORT) vars.SMTP_PORT = String(env.SMTP_PORT);
  if (env.SMTP_USER) vars.SMTP_USER = env.SMTP_USER;
  if (env.SMTP_PASS) vars.SMTP_PASS = env.SMTP_PASS;
  if (env.SMTP_SECURE) vars.SMTP_SECURE = String(env.SMTP_SECURE);
  if (env.DATABASE_URL) vars.DATABASE_URL = env.DATABASE_URL;
  if (env.JWT_SECRET) vars.JWT_SECRET = env.JWT_SECRET;
  if (env.CORS_ORIGIN) vars.CORS_ORIGIN = env.CORS_ORIGIN;
  return vars;
}

async function processJob(job: Job<ExecutionJobData>): Promise<void> {
  const { executionId, workflowId, triggerData } = job.data;

  // Mark as running
  await db
    .update(workflowExecutions)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(workflowExecutions.id, executionId));

  await publishWorkflowExecution(workflowId, executionId, "running", triggerData);

  try {
    const workflow = await findWorkflowById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const dsl = (workflow.publishedDsl ?? workflow.dsl) as {
      nodes: unknown[];
      edges: unknown[];
      trigger: unknown;
      envVars?: Array<{ key: string; value: unknown; type: string }>;
    };

    const { env: workflowEnv, secrets } = splitEnvVars(dsl as Parameters<typeof splitEnvVars>[0]);
    const mergedEnv = mergeServerEnv(getEnvVars(), workflowEnv);

    const startTime = Date.now();
    let result: Awaited<ReturnType<typeof executeWorkflow>> | undefined;
    result = await executeWorkflow(
      {
        version: "1.0",
        trigger: dsl.trigger as {
          type: "state_change" | "schedule" | "manual" | "webhook" | "event" | "cron-trigger";
          config: Record<string, unknown>;
        },
        nodes: dsl.nodes as Parameters<typeof executeWorkflow>[0]["nodes"],
        edges: dsl.edges as Parameters<typeof executeWorkflow>[0]["edges"],
        envVars: (dsl as Parameters<typeof splitEnvVars>[0]).envVars,
      },
      triggerData,
      mergedEnv,
      secrets,
      pluginRegistry,
      false,
      workflowId,
      executionId,
      undefined,
      {
        onNodeLog: async (log) => {
          await publishWorkflowNodeStatus(
            workflowId,
            executionId,
            log.nodeId,
            log.nodeName,
            log.nodeType,
            log.status,
            log.durationMs,
            log.error,
            log.output,
          );
        },
      },
    );

    const durationMs = Date.now() - startTime;

    // Trim nodeLogs to 500 entries
    const nodeLogs = result.nodeLogs ?? [];
    if (nodeLogs.length > 500) {
      nodeLogs.splice(0, nodeLogs.length - 500);
    }

    await db
      .update(workflowExecutions)
      .set({
        status: result.status,
        result: result.output ?? {},
        errorMessage: result.error ?? null,
        nodeLogs,
        completedAt: new Date(),
        durationMs,
      })
      .where(eq(workflowExecutions.id, executionId));

    await publishWorkflowExecution(
      workflowId,
      executionId,
      result.status,
      triggerData,
      result.error ?? null,
      durationMs,
    );
  } catch (error) {
    const failedLogs = result?.nodeLogs ?? [];
    await db
      .update(workflowExecutions)
      .set({
        status: "failed",
        errorMessage: (error as Error).message,
        nodeLogs: failedLogs.length > 500 ? failedLogs.slice(-500) : failedLogs,
        completedAt: new Date(),
        durationMs: 0,
      })
      .where(eq(workflowExecutions.id, executionId));

    await publishWorkflowExecution(
      workflowId,
      executionId,
      "failed",
      triggerData,
      (error as Error).message,
      0,
    );

    throw error;
  }
}

export async function startWorker(): Promise<void> {
  // Load plugin registry before starting worker
  await pluginRegistry.loadAll();
  logger.info(`[worker] Plugin registry loaded, ${pluginRegistry.getAll().length} plugins`);

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const boss = new PgBoss({
    connectionString: dbUrl,
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
  } as ConstructorParameters<typeof PgBoss>[0]);
  await boss.start();

  await boss.work(
    JOB_NAME,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async (jobs: Job<ExecutionJobData>[] | Job<ExecutionJobData>) => {
      for (const job of Array.isArray(jobs) ? jobs : [jobs]) {
        await processJob(job);
      }
    },
  );

  logger.info("[worker] Started listening for workflow.execute jobs");

  // Periodically reload plugin registry to pick up changes from API server
  const RELOAD_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  setInterval(async () => {
    try {
      await pluginRegistry.reload();
      logger.info(`[worker] Plugin registry reloaded, ${pluginRegistry.getAll().length} plugins`);
    } catch (err) {
      logger.error(`[worker] Failed to reload plugin registry: ${(err as Error).message}`);
    }
  }, RELOAD_INTERVAL_MS);
}
