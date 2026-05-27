import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import { workflowExecutions } from "@/schemas/workflows";
import {
  findManyWorkflows,
  findWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  checkWorkflowAccess,
  findWorkflowExecutions,
  findRecentExecutions,
  deleteExecution,
  deleteManyExecutions,
} from "@/repositories/workflows";
import { triggerEngine } from "@/engine/trigger";
import { validateDsl } from "@/engine/validator";
import { executeWorkflow } from "@/engine/executor";
import { splitEnvVars, mergeServerEnv } from "@/engine/env-utils";
import type { WorkflowDSL } from "@/engine/types";

async function getUserRole(userId: string): Promise<string> {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.role ?? "viewer";
}

const workflowBodySchema = z.object({
  slug: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  dsl: z.object({
    version: z.literal("1.0"),
    trigger: z.object({
      type: z.enum(["state_change", "schedule", "manual", "webhook", "event"]),
      config: z.record(z.string(), z.unknown()),
    }),
    nodes: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        config: z.record(z.string(), z.unknown()),
        onError: z
          .object({
            action: z.enum(["retry", "skip", "abort", "goto"]),
            retryCount: z.number().optional(),
            retryDelayMs: z.number().optional(),
            gotoNodeId: z.string().optional(),
          })
          .optional(),
        position: z.object({ x: z.number(), y: z.number() }).optional(),
      }),
    ),
    edges: z.array(
      z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        sourceHandle: z.string().optional(),
        targetHandle: z.string().optional(),
        label: z.string().optional(),
      }),
    ),
    envVars: z
      .array(
        z.object({
          key: z.string(),
          value: z.unknown(),
          type: z.enum(["string", "number", "secret", "boolean"]),
          description: z.string().optional(),
        }),
      )
      .optional(),
    settings: z
      .object({
        autoSave: z
          .object({
            enabled: z.boolean().optional(),
            intervalSeconds: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

export default async function workflowRoutes(fastify: FastifyInstance) {
  // List workflows
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Workflows"],
        summary: "List workflows",
        querystring: z.object({
          page: z.string().optional().default("1"),
          pageSize: z.string().optional().default("20"),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const role = await getUserRole(payload.userId);
      const query = request.query as { page?: string; pageSize?: string };
      const page = Math.max(1, Number(query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
      const result = await findManyWorkflows(payload.userId, role, page, pageSize);
      return reply.send(result);
    },
  );

  // Create workflow
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Create workflow",
        body: workflowBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const body = request.body as z.infer<typeof workflowBodySchema>;

      const dsl = body.dsl as unknown as WorkflowDSL;
      const validationErrors = validateDsl(dsl);
      if (validationErrors.length > 0) {
        return reply.status(400).send({ error: "Invalid workflow DSL", details: validationErrors });
      }

      const id = await createWorkflow(payload.userId, { ...body, dsl });
      return reply.status(201).send({ id });
    },
  );

  // Get workflow by ID
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Get workflow detail",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const workflow = await findWorkflowById(id);
      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }
      return reply.send(workflow);
    },
  );

  // Update workflow
  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Update workflow",
        params: z.object({ id: z.string().uuid() }),
        body: workflowBodySchema.partial(),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const body = request.body as Partial<z.infer<typeof workflowBodySchema>>;

      if (body.dsl) {
        const dsl = body.dsl as unknown as WorkflowDSL;
        const isPublishing = body.enabled === true;

        // Publishing requires strict validation; saving is lenient
        const validationErrors = validateDsl(dsl, isPublishing);
        if (validationErrors.length > 0) {
          return reply.status(400).send({
            error: isPublishing ? "Cannot publish workflow with errors" : "Invalid workflow DSL",
            details: validationErrors,
          });
        }

        if (isPublishing) {
          // Publish: copy dsl to published_dsl and enable
          await updateWorkflow(id, {
            name: body.name,
            dsl,
            publishedDsl: dsl,
            enabled: true,
            bumpVersion: true,
          });
        } else {
          // Save draft: only update dsl
          await updateWorkflow(id, { ...body, dsl } as Parameters<typeof updateWorkflow>[1]);
        }
      } else {
        await updateWorkflow(id, body as Parameters<typeof updateWorkflow>[1]);
      }

      // Fallback: publish current draft when enabling without sending DSL
      if (body.enabled === true && !body.dsl) {
        const current = await findWorkflowById(id);
        if (current?.dsl) {
          const strictErrors = validateDsl(current.dsl, true);
          if (strictErrors.length > 0) {
            return reply
              .status(400)
              .send({ error: "Cannot publish workflow with errors", details: strictErrors });
          }
          await updateWorkflow(id, { publishedDsl: current.dsl, enabled: true, bumpVersion: true });
        }
      }

      return reply.send({ success: true });
    },
  );

  // Delete workflow
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Delete workflow",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      await deleteWorkflow(id);
      return reply.status(204).send();
    },
  );

  // Dry-run test (synchronous, no queue, no side effects)
  fastify.post(
    "/:id/test",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Test workflow with dry run",
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({ nodeId: z.string().optional() }),
        body: z.object({ data: z.record(z.string(), z.unknown()).optional() }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const workflow = await findWorkflowById(id);
      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      const body = (request.body as { data?: Record<string, unknown> }) ?? {};
      const query = request.query as { nodeId?: string };

      let dsl = workflow.dsl as WorkflowDSL;

      // Single-node test: build a temporary DSL with start -> target -> end
      if (query.nodeId) {
        const targetNode = dsl.nodes.find((n) => n.id === query.nodeId);
        if (!targetNode) {
          return reply.status(400).send({ error: `Node ${query.nodeId} not found in workflow` });
        }
        if (targetNode.type === "start" || targetNode.type === "end") {
          return reply
            .status(400)
            .send({ error: `Cannot test node type '${targetNode.type}' directly` });
        }

        const startNode = dsl.nodes.find((n) => n.type === "start") ?? {
          id: "start",
          type: "start",
          name: "开始",
          config: {},
        };
        const endNode = dsl.nodes.find((n) => n.type === "end") ?? {
          id: "end",
          type: "end",
          name: "结束",
          config: {},
        };

        dsl = {
          version: "1.0",
          trigger: { type: "manual", config: {} },
          nodes: [startNode, targetNode, endNode],
          edges: [
            { id: `e-start-${targetNode.id}`, source: "start", target: targetNode.id },
            { id: `e-${targetNode.id}-end`, source: targetNode.id, target: "end" },
          ],
          envVars: dsl.envVars,
          settings: dsl.settings,
        };
      }

      const serverEnv: Record<string, string> = {};
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
      for (const key of allowed) {
        const value = process.env[key];
        if (value) serverEnv[key] = value;
      }

      const { env: workflowEnv, secrets } = splitEnvVars(dsl);
      const mergedEnv = mergeServerEnv(serverEnv, workflowEnv);

      const result = await executeWorkflow(
        dsl,
        { ...body.data, source: "test" },
        mergedEnv,
        secrets,
        (request.server as any).pluginRegistry,
        true,
        id,
      );

      return reply.send(result);
    },
  );

  // Manual trigger
  fastify.post(
    "/:id/trigger",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Trigger workflow manually",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ data: z.record(z.string(), z.unknown()).optional() }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const body = (request.body as { data?: Record<string, unknown> }) ?? {};
      const executionId = await triggerEngine.emitManual(id, payload.userId, body.data ?? {});
      return reply.send({ executionId });
    },
  );

  // List recent executions across all workflows (global)
  fastify.get(
    "/executions",
    {
      schema: {
        tags: ["Workflows"],
        summary: "List recent executions",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const role = await getUserRole(payload.userId);
      const rows = await findRecentExecutions(payload.userId, role, 50);
      return reply.send(
        rows.map((r) => ({
          workflowId: r.workflowId,
          executionId: r.id,
          status: r.status,
          triggerData: r.triggerData,
          errorMessage: r.errorMessage,
          durationMs: r.durationMs,
          timestamp: r.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
      );
    },
  );

  // List executions
  fastify.get(
    "/:id/executions",
    {
      schema: {
        tags: ["Workflows"],
        summary: "List workflow executions",
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          page: z.string().optional().default("1"),
          pageSize: z.string().optional().default("20"),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id } = request.params as { id: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const query = request.query as { page?: string; pageSize?: string };
      const page = Math.max(1, Number(query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
      const result = await findWorkflowExecutions(id, page, pageSize);
      return reply.send(result);
    },
  );

  // Get single execution detail
  fastify.get(
    "/:id/executions/:executionId",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Get workflow execution detail",
        params: z.object({ id: z.string().uuid(), executionId: z.string().uuid() }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id, executionId } = request.params as { id: string; executionId: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const rows = await db
        .select()
        .from(workflowExecutions)
        .where(and(eq(workflowExecutions.workflowId, id), eq(workflowExecutions.id, executionId)))
        .limit(1);

      if (rows.length === 0) {
        return reply.status(404).send({ error: "Execution not found" });
      }

      return reply.send(rows[0]);
    },
  );

  // Delete single execution
  fastify.delete(
    "/:id/executions/:executionId",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Delete workflow execution",
        params: z.object({ id: z.string().uuid(), executionId: z.string().uuid() }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { id, executionId } = request.params as { id: string; executionId: string };
      const role = await getUserRole(payload.userId);

      if (!(await checkWorkflowAccess(id, payload.userId, role))) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      await deleteExecution(executionId);
      return reply.status(204).send();
    },
  );

  // Batch delete executions
  fastify.delete(
    "/executions",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Batch delete workflow executions",
        body: z.object({ ids: z.array(z.string().uuid()) }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string };
      const { ids } = request.body as { ids: string[] };
      const role = await getUserRole(payload.userId);

      // Verify all executions belong to workflows accessible by the user
      const rows = await db
        .select({
          executionId: workflowExecutions.id,
          workflowId: workflowExecutions.workflowId,
        })
        .from(workflowExecutions)
        .where(inArray(workflowExecutions.id, ids));

      for (const row of rows) {
        if (!(await checkWorkflowAccess(row.workflowId, payload.userId, role))) {
          return reply.status(403).send({ error: "Forbidden" });
        }
      }

      await deleteManyExecutions(ids);
      return reply.status(204).send();
    },
  );
}

// Webhook trigger route (public, no JWT)
export async function registerWebhookRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/webhook/:slug",
    {
      schema: {
        tags: ["Workflows"],
        summary: "Trigger workflow via webhook",
        params: z.object({ slug: z.string() }),
        security: [],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug } = request.params as { slug: string };
      const signature =
        (request.headers["x-webhook-signature"] as string) ??
        (request.headers["x-hub-signature-256"] as string) ??
        "";
      const clientIp = request.ip;

      try {
        const executionId = await triggerEngine.emitWebhook(
          slug,
          signature,
          request.body as Record<string, unknown>,
          clientIp,
        );
        return reply.send({ executionId });
      } catch (error) {
        return reply.status(400).send({ error: (error as Error).message });
      }
    },
  );
}
