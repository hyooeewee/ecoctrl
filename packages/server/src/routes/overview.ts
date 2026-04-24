import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardStatsSchema,
  EnergyChartItemSchema,
} from "@ecoctrl/shared";
import type { DashboardStats, EnergyChartItem } from "@ecoctrl/shared";
import { findDashboardStats, findEnergyChart } from "@/repositories/dashboard";

export default async function overviewRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/stats",
    {
      schema: {
        tags: ["Overview"],
        summary: "Get dashboard statistics",
        response: { 200: DashboardStatsSchema },
      },
    },
    async (_request, reply) => {
      const stats: DashboardStats = await findDashboardStats();
      return reply.send(stats);
    },
  );

  fastify.get(
    "/energy-chart",
    {
      schema: {
        tags: ["Overview"],
        summary: "Get weekly energy chart data",
        response: { 200: z.array(EnergyChartItemSchema) },
      },
    },
    async (_request, reply) => {
      const chart: EnergyChartItem[] = await findEnergyChart();
      return reply.send(chart);
    },
  );
}
