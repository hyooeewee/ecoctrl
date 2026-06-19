import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { errors } from "@/lib/schemas";
import {
  findManyNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markNotificationsRead,
} from "@/repositories/notifications";

const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  title: z.string(),
  message: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string().nullable(),
});

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Get all notifications",
        response: { 200: z.array(NotificationSchema) },
      },
    },
    async (_request, reply) => {
      const items = await findManyNotifications();
      return reply.send(
        items.map((item) => ({
          ...item,
          createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        })),
      );
    },
  );

  fastify.get(
    "/unread-count",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Get unread notification count",
        response: { 200: z.object({ count: z.number() }) },
      },
    },
    async (_request, reply) => {
      const count = await countUnreadNotifications();
      return reply.send({ count });
    },
  );

  fastify.put(
    "/:id/read",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Mark a notification as read",
        params: z.object({ id: z.string() }),
        response: {
          200: NotificationSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await markNotificationRead(id);
      if (!updated) {
        return reply.status(404).send({ error: "Notification not found" });
      }
      return reply.send({
        ...updated,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : null,
      });
    },
  );

  fastify.post(
    "/mark-read",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Batch mark notifications as read",
        body: z.object({ ids: z.array(z.string()) }),
        response: { 200: z.object({ marked: z.number() }) },
      },
    },
    async (request, reply) => {
      const { ids } = request.body as { ids: string[] };
      const marked = await markNotificationsRead(ids);
      return reply.send({ marked });
    },
  );
}
