import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Fault, FaultStats } from "@/types/index";
import { getFaults, getFaultStats } from "@/repositories/faults";

const faultItemSchema = z.object({
  id: z.string(),
  device: z.string(),
  level: z.enum(["严重", "一般", "提示"]),
  time: z.string(),
  status: z.enum(["待处理", "维保中", "已修复"]),
});

const faultStatsSchema = z.object({
  totalCount: z.number(),
  trend: z.string(),
  mttr: z.number(),
  avgResponseTime: z.string(),
});

export default async function faultRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get fault list",
        response: { 200: z.array(faultItemSchema) },
      },
    },
    async (_request, reply) => {
      const faults: Fault[] = await getFaults();
      return reply.send(faults);
    },
  );

  fastify.get(
    "/stats",
    {
      schema: {
        summary: "Get fault statistics",
        response: { 200: faultStatsSchema },
      },
    },
    async (_request, reply) => {
      const stats: FaultStats = await getFaultStats();
      return reply.send(stats);
    },
  );
}
