import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PointSchema } from "@ecoctrl/shared";
import { errors } from "@/lib/schemas";
import {
  findManyPoints,
  findPointsByObjectId,
  findPointsByModelId,
  findPointById,
  createPoint,
  updatePoint,
  deletePoint,
} from "@/repositories/points";

export default async function pointRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Points"],
        summary: "Get all points",
        querystring: z
          .object({
            objectId: z.string().optional(),
            modelId: z.string().optional(),
          })
          .optional(),
        response: { 200: z.array(PointSchema) },
      },
    },
    async (request, reply) => {
      const query = request.query as { objectId?: string; modelId?: string } | undefined;
      if (query?.objectId) {
        const items = await findPointsByObjectId(query.objectId);
        return reply.send(items);
      }
      if (query?.modelId) {
        const items = await findPointsByModelId(query.modelId);
        return reply.send(items);
      }
      const items = await findManyPoints();
      return reply.send(items);
    },
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Points"],
        summary: "Get point by ID",
        params: z.object({ id: z.string() }),
        response: {
          200: PointSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const point = await findPointById(id);
      if (!point) {
        return reply.status(404).send({ error: "Point not found" });
      }
      return reply.send(point);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Points"],
        summary: "Create a point",
        body: PointSchema.omit({ id: true }),
        response: {
          201: PointSchema,
        },
      },
    },
    async (request, reply) => {
      const data = request.body as Omit<
        {
          id: string;
          objectId: string;
          modelId: string;
          pointType: string;
          pointNo: string;
          name: string;
          props: { key: string; name: string; unit?: string }[];
          values: Record<string, string>;
        },
        "id"
      >;
      const created = await createPoint(data);
      return reply.status(201).send(created);
    },
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Points"],
        summary: "Update a point",
        params: z.object({ id: z.string() }),
        body: PointSchema.omit({ id: true }).partial(),
        response: {
          200: PointSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const point = await findPointById(id);
      if (!point) {
        return reply.status(404).send({ error: "Point not found" });
      }
      const data = request.body as Record<string, unknown>;
      const updated = await updatePoint(id, data);
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Points"],
        summary: "Delete a point",
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({ success: z.boolean() }),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const point = await findPointById(id);
      if (!point) {
        return reply.status(404).send({ error: "Point not found" });
      }
      await deletePoint(id);
      return reply.send({ success: true });
    },
  );
}
