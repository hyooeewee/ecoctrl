import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardDataSchema,
  DashboardStatsSchema,
  EnergyChartItemSchema,
  AlertSchema,
} from "@ecoctrl/shared";
import type { DashboardStats, EnergyChartItem, Alert, DashboardData } from "@ecoctrl/shared";
import { getDashboardStats, getEnergyChart, getAlerts, getDashboardData } from "@/repositories/dashboard";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get full dashboard data",
        response: { 200: DashboardDataSchema },
      },
    },
    async (_request, reply) => {
      const data: DashboardData = await getDashboardData();
      return reply.send(data);
    },
  );

  fastify.get(
    "/stats",
    {
      schema: {
        summary: "Get dashboard statistics",
        response: { 200: DashboardStatsSchema },
      },
    },
    async (_request, reply) => {
      const stats: DashboardStats = await getDashboardStats();
      return reply.send(stats);
    },
  );

  fastify.get(
    "/energy-chart",
    {
      schema: {
        summary: "Get weekly energy chart data",
        response: { 200: z.array(EnergyChartItemSchema) },
      },
    },
    async (_request, reply) => {
      const chart: EnergyChartItem[] = await getEnergyChart();
      return reply.send(chart);
    },
  );

  fastify.get(
    "/alerts",
    {
      schema: {
        summary: "Get recent alerts",
        querystring: z.object({ limit: z.coerce.number().optional() }),
        response: { 200: z.array(AlertSchema) },
      },
    },
    async (request, reply) => {
      const { limit } = request.query as { limit?: number };
      const alerts: Alert[] = await getAlerts(limit);
      return reply.send(alerts);
    },
  );
}
