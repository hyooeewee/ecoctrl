import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { ReportPlanSchema, ReportTemplateSchema } from "@ecoctrl/shared";
import type { ReportPlan } from "@ecoctrl/shared";
import {
  findManyReportPlans,
  createReportPlan,
  updateReportPlan,
  findManyReportTemplates,
} from "@/repositories/reports";
import { errors } from "@/lib/schemas";

const planBodySchema = z.object({
  name: z.string(),
  receiver: z.string(),
  frequency: z.string(),
  status: z.boolean(),
});

const planUpdateBodySchema = z.object({
  name: z.string().optional(),
  receiver: z.string().optional(),
  frequency: z.string().optional(),
  status: z.boolean().optional(),
});

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/plans",
    {
      schema: {
        tags: ["Reports"],
        summary: "Get report plans",
        response: { 200: z.array(ReportPlanSchema) },
      },
    },
    async (_request, reply) => {
      const plans: ReportPlan[] = await findManyReportPlans();
      return reply.send(plans);
    },
  );

  fastify.post(
    "/plans",
    {
      schema: {
        tags: ["Reports"],
        summary: "Create a report plan",
        body: planBodySchema,
        response: { 201: ReportPlanSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<ReportPlan, "id">;
      const plan: ReportPlan = { id: crypto.randomUUID(), ...body };
      const created = await createReportPlan(plan);
      return reply.status(201).send(created);
    },
  );

  fastify.put(
    "/plans/:id",
    {
      schema: {
        tags: ["Reports"],
        summary: "Update a report plan",
        params: z.object({ id: z.string().describe("Plan ID") }),
        body: planUpdateBodySchema,
        response: {
          200: ReportPlanSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<Omit<ReportPlan, "id">>;
      const updated = await updateReportPlan(id, body);
      if (!updated) {
        return reply.status(404).send({ error: "Plan not found" });
      }
      return reply.send(updated);
    },
  );

  fastify.get(
    "/templates",
    {
      schema: {
        tags: ["Reports"],
        summary: "Get report templates",
        response: { 200: z.array(ReportTemplateSchema) },
      },
    },
    async (_request, reply) => {
      const templates = await findManyReportTemplates();
      return reply.send(templates);
    },
  );
}
