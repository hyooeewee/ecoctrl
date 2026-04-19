import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getModels, saveModels } from "@/repositories/models";
import type { ModelItem } from "@/repositories/models";

const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  format: z.string(),
  size: z.string(),
  thumbnailUrl: z.string().nullable(),
  docUrl: z.string().nullable(),
});

const modelBodySchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    format: z.string(),
    size: z.string(),
    thumbnailUrl: z.string().nullable().optional(),
    docUrl: z.string().nullable().optional(),
  }),
);

export default async function modelRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get 3D models",
        response: { 200: z.array(modelSchema) },
      },
    },
    async (_request, reply) => {
      const models = await getModels();
      return reply.send(models);
    },
  );

  fastify.put(
    "/",
    {
      schema: {
        summary: "Update 3D models",
        body: modelBodySchema,
        response: { 200: z.array(modelSchema) },
      },
    },
    async (request, reply) => {
      const body = request.body as ModelItem[];
      await saveModels(body);
      const models = await getModels();
      return reply.send(models);
    },
  );
}
