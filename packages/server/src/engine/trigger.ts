import { eq, and } from "drizzle-orm";
import { db } from "@/config/database";
import { workflows, workflowExecutions } from "@/schemas/workflows";
import { findWorkflowById } from "@/repositories/workflows";
import { getBoss, publishExecution } from "@/queue/pgboss";
import { evaluateBoolean } from "./expr";
import { buildVars } from "./template";
import { splitEnvVars, mergeServerEnv } from "./env-utils";
import type { ExecutionContext, WorkflowDSL, WorkflowNode, TriggerMode } from "./types";
import { PluginRegistry } from "./plugin-registry";
import { getPluginStorage } from "@/storage";

import { scheduleEngine } from "./scheduler";

const pluginStorage = getPluginStorage();
const pluginRegistry = new PluginRegistry(pluginStorage);

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

function getTriggerNodes(dsl: WorkflowDSL): Array<{ node: WorkflowNode; mode: TriggerMode }> {
  const result: Array<{ node: WorkflowNode; mode: TriggerMode }> = [];
  for (const node of dsl.nodes) {
    const def = pluginRegistry.get(node.type);
    if (!def || def.manifest.category !== "trigger") continue;
    const mode = (def.manifest as { triggerMode?: TriggerMode }).triggerMode;
    if (!mode) continue;
    result.push({ node, mode });
  }
  return result;
}

async function createExecutionAndPublish(
  workflowId: string,
  userId: string,
  startNodeId: string,
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
    startNodeId,
    triggerData,
  });

  return execution.id;
}

function evaluateTriggerCondition(
  dsl: WorkflowDSL,
  triggerData: Record<string, unknown>,
  condition?: string,
): boolean {
  if (!condition) return true;
  const { env: workflowEnv, secrets } = splitEnvVars(dsl);
  const ctx: ExecutionContext = {
    triggerData,
    variables: new Map(),
    nodeOutputs: new Map(),
    env: mergeServerEnv(getEnvVars(), workflowEnv),
    secrets,
  };
  const vars = buildVars(ctx);
  try {
    return evaluateBoolean(condition, vars);
  } catch {
    return false;
  }
}

export const triggerEngine = {
  async loadPlugins(): Promise<void> {
    await pluginRegistry.loadAll();
  },

  // Event: called from business code
  async emitEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
    const rows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.enabled, true), eq(workflows.isLatest, true)));

    for (const workflow of rows) {
      const dsl = (workflow.publishedDsl ?? workflow.dsl) as WorkflowDSL;
      const triggers = getTriggerNodes(dsl).filter((t) => t.mode === "event");
      if (triggers.length === 0) continue;

      for (const { node } of triggers) {
        const config = node.config as { event?: string; condition?: string } | undefined;
        if (config?.event !== eventName) continue;

        const triggerData = { ...payload, event: eventName, source: "event" };
        if (!evaluateTriggerCondition(dsl, triggerData, config.condition)) continue;

        await createExecutionAndPublish(workflow.id, workflow.userId, node.id, triggerData);
      }
    }
  },

  // Manual: called from API. Any published workflow can be triggered manually.
  // Prefers a manual trigger node, then any trigger node, then falls back to
  // the first node with no incoming edges (entry node).
  async emitManual(
    workflowId: string,
    userId: string,
    payload: Record<string, unknown>,
    startNodeId?: string,
  ): Promise<string> {
    const workflow = await findWorkflowById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    if (!workflow.publishedDsl && !workflow.dsl) {
      throw new Error("Workflow has no DSL. Please save or publish before triggering.");
    }

    const dsl = (workflow.publishedDsl ?? workflow.dsl) as WorkflowDSL;
    const triggerNodes = getTriggerNodes(dsl);

    // Determine the entry node for execution
    let entryNodeId: string;

    if (startNodeId) {
      // Explicit start node requested
      entryNodeId = startNodeId;
    } else if (triggerNodes.length > 0) {
      // Prefer manual triggers, fall back to any trigger
      const manualTriggers = triggerNodes.filter((t) => t.mode === "manual");
      const entry = manualTriggers.length > 0 ? manualTriggers[0] : triggerNodes[0];
      entryNodeId = entry.node.id;
    } else {
      // No trigger nodes — find the first node with no incoming edges
      const targetIds = new Set(dsl.edges.map((e) => e.target));
      const entryNode = dsl.nodes.find((n) => !targetIds.has(n.id));
      if (!entryNode) {
        throw new Error("Workflow has no entry node");
      }
      entryNodeId = entryNode.id;
    }

    return createExecutionAndPublish(workflowId, userId, entryNodeId, {
      ...payload,
      source: "manual",
    });
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
    const dsl = (workflow.publishedDsl ?? workflow.dsl) as WorkflowDSL;
    const webhookTriggers = getTriggerNodes(dsl).filter((t) => t.mode === "webhook");
    if (webhookTriggers.length === 0) {
      throw new Error("Workflow has no webhook trigger node");
    }

    // For now, use the first webhook trigger node if there are multiple
    const { node } = webhookTriggers[0]!;
    const config = node.config as { secret?: string; allowedIps?: string[] } | undefined;

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
      const actual = signature.replace(/^sha256=/, "");
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
        throw new Error("Invalid webhook signature");
      }
    }

    return createExecutionAndPublish(workflow.id, workflow.userId, node.id, {
      ...payload,
      source: "webhook",
      clientIp,
    });
  },

  // Schedule management: keep in-process timers in sync with enabled workflows.
  // pg-boss only supports minute-level scheduling, so schedule trigger nodes use
  // a lightweight cron-parser based engine that supports second-level crons.
  async syncSchedules(): Promise<void> {
    // Unschedule any legacy pg-boss schedule entries. The custom scheduler owns
    // schedule triggers now.
    const boss = getBoss();
    const scheduled = await boss.getSchedules();
    for (const s of scheduled) {
      if (s.name.startsWith("workflow.schedule.")) {
        await boss.unschedule(s.name);
      }
    }

    const rows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.enabled, true), eq(workflows.isLatest, true)));

    const scheduleWorkflows = rows.map((workflow) => {
      const dsl = (workflow.publishedDsl ?? workflow.dsl) as WorkflowDSL;
      const scheduleNodes = getTriggerNodes(dsl)
        .filter((t) => t.mode === "schedule")
        .map((t) => t.node);
      return { id: workflow.id, userId: workflow.userId, dsl, scheduleNodes };
    });

    scheduleEngine.sync(
      (entry) =>
        createExecutionAndPublish(entry.workflowId, entry.userId, entry.nodeId, {
          source: "schedule",
        }),
      scheduleWorkflows,
    );
  },
};
