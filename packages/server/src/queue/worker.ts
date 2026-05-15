import { PgBoss, type Job } from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { workflowExecutions } from "@/schemas/workflows";
import { findWorkflowById } from "@/repositories/workflows";
import { executeWorkflow } from "@/engine/executor";
import { getLogger } from "@/lib/logger";
import type { ExecutionJobData } from "./pgboss";

const logger = getLogger("queue");

const JOB_NAME = "workflow.execute";

function getEnvVars(): Record<string, string> {
  const allowed = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_SECURE",
    "DATABASE_URL",
    "JWT_SECRET",
    "CORS_ORIGIN",
  ];
  const env: Record<string, string> = {};
  for (const key of allowed) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

async function processJob(job: Job<ExecutionJobData>): Promise<void> {
  const { executionId, workflowId, triggerData } = job.data;

  // Mark as running
  await db
    .update(workflowExecutions)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(workflowExecutions.id, executionId));

  try {
    const workflow = await findWorkflowById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const dsl = workflow.dsl as { nodes: unknown[]; edges: unknown[]; trigger: unknown };
    const startTime = Date.now();
    const result = await executeWorkflow(
      {
        version: "1.0",
        trigger: dsl.trigger as {
          type: "state_change" | "schedule" | "manual" | "webhook" | "event";
          config: Record<string, unknown>;
        },
        nodes: dsl.nodes as Parameters<typeof executeWorkflow>[0]["nodes"],
        edges: dsl.edges as Parameters<typeof executeWorkflow>[0]["edges"],
      },
      triggerData,
      getEnvVars(),
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
  } catch (error) {
    await db
      .update(workflowExecutions)
      .set({
        status: "failed",
        errorMessage: (error as Error).message,
        completedAt: new Date(),
        durationMs: 0,
      })
      .where(eq(workflowExecutions.id, executionId));
    throw error;
  }
}

export async function startWorker(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
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
}
