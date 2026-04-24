import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardDataSchema,
  AlertSchema,
} from "@ecoctrl/shared";
import type { DashboardData, Alert } from "@ecoctrl/shared";
import { findManyAlerts, findDashboardData } from "@/repositories/dashboard";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Get full dashboard data",
        response: { 200: DashboardDataSchema },
      },
    },
    async (_request, reply) => {
      const data: DashboardData = await findDashboardData();
      return reply.send(data);
    },
  );

  fastify.get(
    "/alerts",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Get recent alerts",
        querystring: z.object({ limit: z.coerce.number().optional() }),
        response: { 200: z.array(AlertSchema) },
      },
    },
    async (request, reply) => {
      const { limit } = request.query as { limit?: number };
      const alerts: Alert[] = await findManyAlerts(limit);
      return reply.send(alerts);
    },
  );
}
