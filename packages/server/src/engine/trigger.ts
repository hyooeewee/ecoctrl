import { eq, and } from "drizzle-orm";
import { db } from "@/config/database";
import { workflows, workflowExecutions } from "@/schemas/workflows";
import { getBoss, publishExecution, scheduleWorkflow, unscheduleWorkflow } from "@/queue/pgboss";
import { evaluateBoolean } from "./expr";
import { buildVars } from "./template";
import { splitEnvVars, mergeServerEnv } from "./env-utils";
import type { ExecutionContext, WorkflowDSL } from "./types";

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

async function createExecutionAndPublish(
  workflowId: string,
  userId: string,
  triggerData: Record<string, unknown>,
): Promise<string> {
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId,
      userId,
      status: "pending",
      triggerData,
    })
    .returning({ id: workflowExecutions.id });

  await publishExecution({
    executionId: execution.id,
    workflowId,
    userId,
    triggerData,
  });

  return execution.id;
}

export const triggerEngine = {
  // State change: called from object repository after update
  async emitStateChange(
    objectUuid: string,
    pointId: string,
    key: string,
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    const rows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.enabled, true), eq(workflows.isLatest, true)));

    for (const workflow of rows) {
      const dsl = (workflow.publishedDsl ?? workflow.dsl) as {
        trigger?: { type: string; config?: Record<string, unknown> };
        envVars?: WorkflowDSL["envVars"];
      };
      if (dsl.trigger?.type !== "state_change") continue;

      const config = dsl.trigger.config as { watch?: string[]; condition?: string } | undefined;
      if (!config?.watch) continue;

      // Check if any watch path matches this change
      const watchPaths = config.watch;
      const matched = watchPaths.some((path) => {
        // Match patterns like:
        // - objects.*.points.temperature.value
        // - objects.{uuid}.points.{pointId}.values.{key}
        const parts = path.split(".");
        if (parts.length < 2) return false;
        if (parts[0] !== "objects") return false;

        // Check object uuid wildcard
        if (parts[1] !== "*" && parts[1] !== objectUuid) return false;

        // Check point path: points.{pointId}.values.{key}
        if (parts.length >= 5) {
          if (parts[2] === "points" || parts[2] === "values") {
            const pathPointId = parts[3];
            const pathKey = parts[4];
            if (pathPointId && pathPointId !== "*" && pathPointId !== pointId) return false;
            if (pathKey && pathKey !== "*" && pathKey !== key) return false;
            return true;
          }
        }

        return false;
      });

      if (!matched) continue;

      const triggerData: Record<string, unknown> = {
        objectUuid,
        pointId,
        key,
        oldValue,
        newValue,
        source: "state_change",
      };

      // Evaluate condition if present
      if (config.condition) {
        const { env: workflowEnv, secrets } = splitEnvVars(dsl as WorkflowDSL);
        const ctx: ExecutionContext = {
          triggerData,
          variables: new Map(),
          nodeOutputs: new Map(),
          env: mergeServerEnv(getEnvVars(), workflowEnv),
          secrets,
        };
        const vars = buildVars(ctx);
        try {
          const passes = evaluateBoolean(config.condition, vars);
          if (!passes) continue;
        } catch {
          continue;
        }
      }

      await createExecutionAndPublish(workflow.id, workflow.userId, triggerData);
    }
  },

  // Event: called from business code
  async emitEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
    const rows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.enabled, true), eq(workflows.isLatest, true)));

    for (const workflow of rows) {
      const dsl = (workflow.publishedDsl ?? workflow.dsl) as {
        trigger?: { type: string; config?: Record<string, unknown> };
        envVars?: WorkflowDSL["envVars"];
      };
      if (dsl.trigger?.type !== "event") continue;

      const config = dsl.trigger.config as { event?: string; condition?: string } | undefined;
      if (config?.event !== eventName) continue;

      const triggerData = { ...payload, event: eventName, source: "event" };

      if (config.condition) {
        const { env: workflowEnv, secrets } = splitEnvVars(dsl as WorkflowDSL);
        const ctx: ExecutionContext = {
          triggerData,
          variables: new Map(),
          nodeOutputs: new Map(),
          env: mergeServerEnv(getEnvVars(), workflowEnv),
          secrets,
        };
        const vars = buildVars(ctx);
        try {
          const passes = evaluateBoolean(config.condition, vars);
          if (!passes) continue;
        } catch {
          continue;
        }
      }

      await createExecutionAndPublish(workflow.id, workflow.userId, triggerData);
    }
  },

  // Manual: called from API
  async emitManual(
    workflowId: string,
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    return createExecutionAndPublish(workflowId, userId, { ...payload, source: "manual" });
  },

  // Webhook: called from public route
  async emitWebhook(
    slug: string,
    signature: string,
    payload: Record<string, unknown>,
    clientIp: string,
  ): Promise<string> {
    const rows = await db
      .select()
      .from(workflows)
      .where(
        and(eq(workflows.enabled, true), eq(workflows.isLatest, true), eq(workflows.slug, slug)),
      );

    if (rows.length === 0) {
      throw new Error("Webhook workflow not found");
    }

    const workflow = rows[0]!;
    const dsl = (workflow.publishedDsl ?? workflow.dsl) as {
      trigger?: { type: string; config?: Record<string, unknown> };
    };
    if (dsl.trigger?.type !== "webhook") {
      throw new Error("Workflow is not a webhook trigger");
    }

    const config = dsl.trigger.config as { secret?: string; allowedIps?: string[] } | undefined;

    // Validate allowed IPs
    if (config?.allowedIps && config.allowedIps.length > 0) {
      if (!config.allowedIps.includes(clientIp)) {
        throw new Error("Client IP not allowed");
      }
    }

    // Validate HMAC signature if secret is configured
    if (config?.secret) {
      const crypto = await import("node:crypto");
      const expected = crypto
        .createHmac("sha256", config.secret)
        .update(JSON.stringify(payload))
        .digest("hex");
      // Support "sha256=<hex>" or just "<hex>" format
      const actual = signature.replace(/^sha256=/, "");
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
        throw new Error("Invalid webhook signature");
      }
    }

    return createExecutionAndPublish(workflow.id, workflow.userId, {
      ...payload,
      source: "webhook",
      clientIp,
    });
  },

  // Schedule management: register/unregister cron schedules
  async syncSchedules(): Promise<void> {
    const boss = getBoss();
    // Get all schedules
    const scheduled = await boss.getSchedules();
    const scheduledIds = new Set(
      scheduled.map((s: { name: string }) => s.name.replace(/^workflow:schedule:/, "")),
    );

    // Get all enabled schedule workflows
    const rows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.enabled, true), eq(workflows.isLatest, true)));

    const activeScheduleIds = new Set<string>();

    for (const workflow of rows) {
      const dsl = (workflow.publishedDsl ?? workflow.dsl) as {
        trigger?: { type: string; config?: Record<string, unknown> };
      };
      if (dsl.trigger?.type !== "schedule") continue;

      const config = dsl.trigger.config as { cron?: string; timezone?: string } | undefined;
      if (!config?.cron) continue;

      activeScheduleIds.add(workflow.id);

      if (!scheduledIds.has(workflow.id)) {
        await scheduleWorkflow(workflow.id, config.cron, config.timezone ?? "Asia/Shanghai");
      }
    }

    // Unschedule workflows that are no longer active
    for (const scheduledId of scheduledIds as Set<string>) {
      if (!activeScheduleIds.has(scheduledId)) {
        await unscheduleWorkflow(scheduledId);
      }
    }
  },
};
