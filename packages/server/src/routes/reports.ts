import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import type { ReportPlan } from "@/types/index";
import {
  getReportPlans,
  addReportPlan,
  updateReportPlan,
  getReportTemplates,
} from "@/repositories/reports";

const planSchema = z.object({
  id: z.string(),
  name: z.string(),
  receiver: z.string(),
  frequency: z.string(),
  status: z.boolean(),
});

const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  count: z.string(),
  icon: z.string(),
});

const errorResponseSchema = z.object({ error: z.string() });

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
        summary: "Get report plans",
        response: { 200: z.array(planSchema) },
      },
    },
    async (_request, reply) => {
      const plans: ReportPlan[] = await getReportPlans();
      return reply.send(plans);
    },
  );

  fastify.post(
    "/plans",
    {
      schema: {
        summary: "Create a report plan",
        body: planBodySchema,
        response: { 201: planSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<ReportPlan, "id">;
      const id = crypto.randomUUID();
      const plan: ReportPlan = { id, ...body };
      await addReportPlan(plan);
      return reply.status(201).send(plan);
    },
  );

  fastify.put(
    "/plans/:id",
    {
      schema: {
        summary: "Update a report plan",
        params: z.object({ id: z.string().describe("Plan ID") }),
        body: planUpdateBodySchema,
        response: {
          200: planSchema,
          404: errorResponseSchema,
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
        summary: "Get report templates",
        response: { 200: z.array(templateSchema) },
      },
    },
    async (_request, reply) => {
      const templates = await getReportTemplates();
      return reply.send(templates);
    },
  );
}
