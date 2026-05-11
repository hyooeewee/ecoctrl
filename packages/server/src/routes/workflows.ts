import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import {
  findManyWorkflows,
  findWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  checkWorkflowAccess,
  findWorkflowExecutions,
} from "@/repositories/workflows";
import { triggerEngine } from "@/engine/trigger";
import { validateDsl } from "@/engine/validator";
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
        const validationErrors = validateDsl(dsl);
        if (validationErrors.length > 0) {
          return reply
            .status(400)
            .send({ error: "Invalid workflow DSL", details: validationErrors });
        }
        await updateWorkflow(id, { ...body, dsl } as Parameters<typeof updateWorkflow>[1]);
      } else {
        await updateWorkflow(id, body as Parameters<typeof updateWorkflow>[1]);
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
