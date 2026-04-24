import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FaultSchema, FaultStatsSchema } from "@ecoctrl/shared";
import type { Fault, FaultStats } from "@ecoctrl/shared";
import { getFaults, getFaultStats } from "@/repositories/faults";

export default async function faultRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Faults"],
        summary: "Get fault list",
        response: { 200: z.array(FaultSchema) },
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
        tags: ["Faults"],
        summary: "Get fault statistics",
        response: { 200: FaultStatsSchema },
      },
    },
    async (_request, reply) => {
      const stats: FaultStats = await getFaultStats();
      return reply.send(stats);
    },
  );
}
