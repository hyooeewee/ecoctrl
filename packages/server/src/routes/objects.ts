import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BusinessObjectSchema } from "@ecoctrl/shared";
import {
  findManyObjects,
  findObjectByUuid,
  createObject,
  updateObject,
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
        body: BusinessObjectSchema.omit({ uuid: true }),
        response: {
          201: BusinessObjectSchema,
        },
      },
    },
    async (request, reply) => {
      const data = request.body as {
        id: string;
        name: string;
        modelId: string;
        modelName: string;
        status?: string;
        points: {
          pointId: string;
          pointName: string;
          values: Record<string, string>;
        }[];
      };

      const created = await createObject(data);
      return reply.status(201).send(created);
    },
  );

  fastify.put(
    "/:uuid",
    {
      schema: {
        tags: ["Objects"],
        summary: "Update a business object",
        params: z.object({ uuid: z.string() }),
        body: BusinessObjectSchema.omit({ uuid: true }).partial(),
        response: {
          200: BusinessObjectSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };
      const obj = await findObjectByUuid(uuid);
      if (!obj) {
        return reply.status(404).send({ error: "Object not found" });
      }
      const data = request.body as Record<string, unknown>;
      const updated = await updateObject(uuid, data);
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/:uuid",
    {
      schema: {
        tags: ["Objects"],
        summary: "Delete a business object",
        params: z.object({ uuid: z.string() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };
      const obj = await findObjectByUuid(uuid);
      if (!obj) {
        return reply.status(404).send({ error: "Object not found" });
      }
      await deleteObject(uuid);
      return reply.send({ success: true });
    },
  );
}
