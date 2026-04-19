import type { FastifyInstance } from "fastify";
import type { Fault, FaultStats } from "@/types/index";
import { getFaults, getFaultStats } from "@/db/faults";

const faultItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    device: { type: "string" },
    level: { type: "string", enum: ["严重", "一般", "提示"] },
    time: { type: "string" },
    status: { type: "string", enum: ["待处理", "维保中", "已修复"] },
  },
};

const faultStatsSchema = {
  type: "object",
  properties: {
    totalCount: { type: "number" },
    trend: { type: "string" },
    mttr: { type: "number" },
    avgResponseTime: { type: "string" },
  },
};

export default async function faultRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get fault list",
        response: {
          200: {
            type: "array",
            items: faultItemSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const faults: Fault[] = getFaults();
      return reply.send(faults);
    },
  );

  fastify.get(
    "/stats",
    {
      schema: {
        summary: "Get fault statistics",
        response: {
          200: faultStatsSchema,
        },
      },
    },
    async (_request, reply) => {
      const stats: FaultStats = getFaultStats();
      return reply.send(stats);
    },
  );
}
