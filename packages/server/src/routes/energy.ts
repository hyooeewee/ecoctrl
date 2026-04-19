import type { FastifyInstance } from "fastify";
import { getEnergyAreas, saveEnergyAreas } from "@/repositories/energyAreas";
import type { EnergyArea } from "@/repositories/energyAreas";

const areaSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    title: { type: "string" },
    current: { type: "number" },
    target: { type: "number" },
    color: { type: "string" },
    powerFactor: { type: "number" },
    loadRate: { type: "string" },
  },
};

export default async function energyRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => reply.send([]));

  fastify.get(
    "/areas",
    {
      schema: {
        summary: "Get energy areas",
        response: {
          200: {
            type: "array",
            items: areaSchema,
          },
        },
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
        body: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "current", "target", "color", "powerFactor", "loadRate"],
            properties: {
              title: { type: "string" },
              current: { type: "number" },
              target: { type: "number" },
              color: { type: "string" },
              powerFactor: { type: "number" },
              loadRate: { type: "string" },
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: areaSchema,
          },
        },
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
