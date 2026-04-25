import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AlertSchema,
  WidgetConfigSchema,
  WidgetLayoutSchema,
} from "@ecoctrl/shared";
import type { Alert } from "@ecoctrl/shared";
import { findManyAlerts, findDashboardData } from "@/repositories/dashboard";
import { findOnlineUser } from "@/repositories/users";

const WidgetConfigWithLayoutSchema = WidgetConfigSchema.extend({
  hidden: z.boolean(),
  layout: WidgetLayoutSchema,
});

const DashboardDataWithLayoutSchema = z.object({
  widgets: z.array(WidgetConfigWithLayoutSchema),
});

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Get full dashboard data",
        response: { 200: DashboardDataWithLayoutSchema },
      },
    },
    async (_request, reply) => {
      const user = await findOnlineUser();
      const data = await findDashboardData(user?.id);
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
