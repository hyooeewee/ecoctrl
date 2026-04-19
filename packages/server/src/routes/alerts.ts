import type { FastifyInstance } from "fastify";
import type { Alert } from "@/types/index";
import { getAlerts } from "@/repositories/dashboard";

const alertSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    device: { type: "string" },
    level: { type: "string", enum: ["high", "medium", "low"] },
    message: { type: "string" },
    time: { type: "string" },
    status: { type: "string", enum: ["pending", "resolved"] },
  },
};

export default async function alertRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get recent alerts",
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", description: "Max number of alerts to return" },
          },
        },
        response: {
          200: {
            type: "array",
            items: alertSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { limit } = request.query as { limit?: string };
      const alerts: Alert[] = await getAlerts(limit ? parseInt(limit, 10) : undefined);
      return reply.send(alerts);
    },
  );
}
