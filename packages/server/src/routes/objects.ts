import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BusinessObjectSchema } from "@ecoctrl/shared";
import {
  findManyObjects,
  findObjectById,
  createObject,
  deleteObject,
} from "@/repositories/objects";

export default async function objectRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Objects"],
        summary: "Get business objects",
        response: { 200: z.array(BusinessObjectSchema) },
      },
    },
    async (_request, reply) => {
      const items = await findManyObjects();
      return reply.send(items);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Objects"],
        summary: "Create a business object",
        body: BusinessObjectSchema,
        response: {
          201: BusinessObjectSchema,
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const data = request.body as {
        id: string;
        name: string;
        modelId: string;
        modelName: string;
        points: { id: string; pointId: string; pointName: string; values: Record<string, string> }[];
      };

      const existing = await findObjectById(data.id);
      if (existing) {
        return reply.status(409).send({ error: "Object ID already exists" });
      }

      const created = await createObject(data);
      return reply.status(201).send(created);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Objects"],
        summary: "Delete a business object",
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const obj = await findObjectById(id);
      if (!obj) {
        return reply.status(404).send({ error: "Object not found" });
      }
      await deleteObject(id);
      return reply.send({ success: true });
    },
  );
}
