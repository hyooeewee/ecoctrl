import type { FastifyInstance } from "fastify";
import type { DashboardStats, EnergyChartItem, Alert, DashboardData } from "@/types/index";
import { getDashboardStats, getEnergyChart, getAlerts, getDashboardData } from "@/db/dashboard";
import {
  dashboardDataSchema,
  statsSchema,
  energyChartSchema,
  alertsSchema,
} from "@/schemas/dashboard";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    { schema: dashboardDataSchema },
    async (_request, reply) => {
      const data: DashboardData = getDashboardData();
      return reply.send(data);
    },
  );

  fastify.get(
    "/stats",
    { schema: statsSchema },
    async (_request, reply) => {
      const stats: DashboardStats = getDashboardStats();
      return reply.send(stats);
    },
  );

  fastify.get(
    "/energy-chart",
    { schema: energyChartSchema },
    async (_request, reply) => {
      const chart: EnergyChartItem[] = getEnergyChart();
      return reply.send(chart);
    },
  );

  fastify.get(
    "/alerts",
    { schema: alertsSchema },
    async (request, reply) => {
      const { limit } = request.query as { limit?: string };
      const alerts: Alert[] = getAlerts(limit ? parseInt(limit, 10) : undefined);
      return reply.send(alerts);
    },
  );
}
