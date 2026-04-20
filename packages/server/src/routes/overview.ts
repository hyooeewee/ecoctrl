import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardStatsSchema,
  EnergyChartItemSchema,
} from "@ecoctrl/shared";
import type { DashboardStats, EnergyChartItem } from "@ecoctrl/shared";
import { getDashboardStats, getEnergyChart } from "@/repositories/dashboard";

export default async function overviewRoutes(fastify: FastifyInstance) {
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
}
