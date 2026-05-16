import { PgBoss } from "pg-boss";
import { getLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const logger = getLogger("queue");

const JOB_NAME = "workflow.execute";

let boss: PgBoss | null = null;

export interface ExecutionJobData {
  executionId: string;
  workflowId: string;
  userId: string;
  triggerData: Record<string, unknown>;
}

export async function initQueue(): Promise<PgBoss> {
  if (boss) return boss;
  const dbUrl = env.DATABASE_URL;
  boss = new PgBoss({
    connectionString: dbUrl,
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    poolSize: 5,
  } as ConstructorParameters<typeof PgBoss>[0]);

  boss.on("error", (err) => {
    logger.error({ err: err.message }, "[pg-boss] connection error");
  });

  await boss.start();
  await boss.createQueue(JOB_NAME);
  logger.info("[pg-boss] Queue initialized");
  return boss;
}

export function getBoss(): PgBoss {
  if (!boss) {
    throw new Error("pg-boss not initialized. Call initQueue() first.");
  }
  return boss;
}

export async function publishExecution(data: ExecutionJobData): Promise<string> {
  const b = getBoss();
  const id = await b.send(JOB_NAME, data, {
    retryLimit: 3,
    expireInSeconds: 300, // 5 minutes timeout
  });
  if (!id) {
    throw new Error("Failed to publish execution job");
  }
  return id;
}

export async function scheduleWorkflow(
  workflowId: string,
  cron: string,
  timezone: string,
): Promise<void> {
  const b = getBoss();
  await b.schedule(`workflow.schedule.${workflowId}`, cron, { workflowId }, { tz: timezone });
}

export async function unscheduleWorkflow(workflowId: string): Promise<void> {
  const b = getBoss();
  await b.unschedule(`workflow.schedule.${workflowId}`);
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
