import type { FastifyInstance } from "fastify";
import type { DashboardStats, EnergyChartItem, Alert } from "@/types/index";
import { getDashboardStats, getEnergyChart, getAlerts } from "@/db/dashboard";

const statItemSchema = {
  type: "object",
  properties: {
    value: { type: "string" },
    unit: { type: "string" },
    trend: { type: "string" },
    trendType: { type: "string", enum: ["up", "down"] },
  },
};

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

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/stats",
    {
      schema: {
        summary: "Get dashboard statistics",
        response: {
          200: {
            type: "object",
            properties: {
              totalEnergy: statItemSchema,
              onlineRate: statItemSchema,
              pendingAlerts: statItemSchema,
              carbonEmission: statItemSchema,
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const stats: DashboardStats = getDashboardStats();
      return reply.send(stats);
    },
  );

  fastify.get(
    "/energy-chart",
    {
      schema: {
        summary: "Get weekly energy chart data",
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const chart: EnergyChartItem[] = getEnergyChart();
      return reply.send(chart);
    },
  );

  fastify.get(
    "/alerts",
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
      const alerts: Alert[] = getAlerts(limit ? parseInt(limit, 10) : undefined);
      return reply.send(alerts);
    },
  );
}
