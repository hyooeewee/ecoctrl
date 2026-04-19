import type { FastifyInstance } from "fastify";
import { getModels, saveModels } from "@/repositories/models";
import type { ModelItem } from "@/repositories/models";

const modelSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    version: { type: "string" },
    format: { type: "string" },
    size: { type: "string" },
    thumbnailUrl: { type: "string", nullable: true },
    docUrl: { type: "string", nullable: true },
  },
};

export default async function modelRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get 3D models",
        response: {
          200: {
            type: "array",
            items: modelSchema,
          },
        },
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
        body: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "name", "version", "format", "size"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              version: { type: "string" },
              format: { type: "string" },
              size: { type: "string" },
              thumbnailUrl: { type: "string", nullable: true },
              docUrl: { type: "string", nullable: true },
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: modelSchema,
          },
        },
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
