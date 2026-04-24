import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Alert } from "@/types/index";
import { findManyAlerts } from "@/repositories/dashboard";

const alertSchema = z.object({
  id: z.string(),
  device: z.string(),
  level: z.enum(["high", "medium", "low"]),
  message: z.string(),
  time: z.string(),
  status: z.enum(["pending", "resolved"]),
});

export default async function alertRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Alerts"],
        summary: "Get recent alerts",
        querystring: z.object({ limit: z.coerce.number().optional() }),
        response: { 200: z.array(alertSchema) },
      },
    },
    async (request, reply) => {
      const { limit } = request.query as { limit?: number };
      const alerts: Alert[] = await findManyAlerts(limit);
      return reply.send(alerts);
    },
  );
}
