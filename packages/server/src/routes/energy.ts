import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getEnergyAreas, saveEnergyAreas } from "@/repositories/energyAreas";
import type { EnergyArea } from "@/repositories/energyAreas";

const areaSchema = z.object({
  id: z.number(),
  title: z.string(),
  current: z.number(),
  target: z.number(),
  color: z.string(),
  powerFactor: z.number(),
  loadRate: z.string(),
});

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
        response: { 200: z.array(areaSchema) },
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
        response: { 200: z.array(areaSchema) },
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
