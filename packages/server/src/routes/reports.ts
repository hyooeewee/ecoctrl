import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import type { ReportPlan } from "../types/index.js";
import {
  getReportPlans,
  addReportPlan,
  updateReportPlan,
  getReportTemplates,
} from "../db/reports.js";

const planSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    receiver: { type: "string" },
    frequency: { type: "string" },
    status: { type: "boolean" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/plans",
    {
      schema: {
        summary: "Get report plans",
        response: {
          200: {
            type: "array",
            items: planSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const plans: ReportPlan[] = getReportPlans();
      return reply.send(plans);
    },
  );

  fastify.post(
    "/plans",
    {
      schema: {
        summary: "Create a report plan",
        body: {
          type: "object",
          required: ["name", "receiver", "frequency", "status"],
          properties: {
            name: { type: "string" },
            receiver: { type: "string" },
            frequency: { type: "string" },
            status: { type: "boolean" },
          },
        },
        response: {
          201: planSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<ReportPlan, "id">;
      const plan: ReportPlan = { id: crypto.randomUUID(), ...body };
      addReportPlan(plan);
      return reply.status(201).send(plan);
    },
  );

  fastify.put(
    "/plans/:id",
    {
      schema: {
        summary: "Update a report plan",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Plan ID" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            receiver: { type: "string" },
            frequency: { type: "string" },
            status: { type: "boolean" },
          },
        },
        response: {
          200: planSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<Omit<ReportPlan, "id">>;
      const updated = updateReportPlan(id, body);
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
        response: {
          200: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    async (_request, reply) => {
      const templates: string[] = getReportTemplates();
      return reply.send(templates);
    },
  );
}
