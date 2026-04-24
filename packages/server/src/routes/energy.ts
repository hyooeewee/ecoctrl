import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EnergyAreaSchema } from "@ecoctrl/shared";
import type { EnergyArea } from "@ecoctrl/shared";
import { getEnergyAreas, saveEnergyAreas } from "@/repositories/energyAreas";

const areaBodySchema = z.array(
  z.object({
    title: z.string(),
    current: z.number(),
    target: z.number(),
    color: z.string(),
    powerFactor: z.number(),
    loadRate: z.string(),
  }),
);

export default async function energyRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => reply.send([]));

  fastify.get(
    "/areas",
    {
      schema: {
        summary: "Get energy areas",
        response: { 200: z.array(EnergyAreaSchema) },
      },
    },
    async (_request, reply) => {
      const areas = await getEnergyAreas();
      return reply.send(areas);
    },
  );

  fastify.put(
    "/areas",
    {
      schema: {
        summary: "Update energy areas",
        body: areaBodySchema,
        response: { 200: z.array(EnergyAreaSchema) },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<EnergyArea, "id">[];
      await saveEnergyAreas(body);
      const areas = await getEnergyAreas();
      return reply.send(areas);
    },
  );
}
