import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { MaintenanceReminderSchema, MaintenanceReminderDetailSchema } from "@ecoctrl/shared";
import type { MaintenanceReminder, MaintenanceReminderDetail } from "@ecoctrl/shared";
import { findManyReminders, updateReminder, deleteReminder } from "@/repositories/maintenance";

const errorResponseSchema = z.object({ error: z.string() });

const createBodySchema = z.object({
  task: z.string(),
  description: z.string().optional(),
  dueDate: z.string(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]).optional(),
  assignee: z.string().optional(),
  location: z.string().optional(),
  estimatedHours: z.number().optional(),
  lastCompleted: z.string().optional(),
});

const replaceBodySchema = z.object({
  task: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]).optional(),
  assignee: z.string().optional(),
  location: z.string().optional(),
  estimatedHours: z.number().optional(),
  lastCompleted: z.string().optional(),
});

export default async function maintenanceRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/reminders",
    {
      schema: {
        tags: ["Maintenance"],
        summary: "Get maintenance reminders list",
        response: { 200: z.array(MaintenanceReminderSchema) },
      },
    },
    async (_request, reply) => {
      const reminders = await findManyReminders();
      const list: MaintenanceReminder[] = reminders.map((r) => ({
        id: r.id,
        task: r.task,
        dueDate: r.dueDate,
        priority: r.priority,
      }));
      return reply.send(list);
    },
  );

  fastify.get(
    "/reminders/:id",
    {
      schema: {
        tags: ["Maintenance"],
        summary: "Get maintenance reminder detail",
        params: z.object({ id: z.string().describe("Reminder ID") }),
        response: {
          200: MaintenanceReminderDetailSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reminders = await findManyReminders();
      const reminder = reminders.find((r) => r.id === id);
      if (!reminder) {
        return reply.status(404).send({ error: "Reminder not found" });
      }
      return reply.send(reminder);
    },
  );

  fastify.post(
    "/reminders",
    {
      schema: {
        tags: ["Maintenance"],
        summary: "Create a maintenance reminder",
        body: createBodySchema,
        response: { 201: MaintenanceReminderDetailSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as Partial<MaintenanceReminderDetail>;
      const reminders = await findManyReminders();

      const newReminder: MaintenanceReminderDetail = {
        id: crypto.randomUUID(),
        task: body.task ?? "",
        description: body.description ?? "",
        dueDate: body.dueDate ?? "",
        priority: body.priority ?? "medium",
        status: body.status ?? "pending",
        assignee: body.assignee ?? "",
        location: body.location ?? "",
        estimatedHours: body.estimatedHours ?? 0,
        lastCompleted: body.lastCompleted ?? null,
      };

      reminders.push(newReminder);
      await updateReminder(newReminder);
      return reply.status(201).send(newReminder);
    },
  );

  fastify.put(
    "/reminders/:id",
    {
      schema: {
        tags: ["Maintenance"],
        summary: "Replace a maintenance reminder",
        params: z.object({ id: z.string().describe("Reminder ID") }),
        body: replaceBodySchema,
        response: {
          200: MaintenanceReminderDetailSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Omit<MaintenanceReminderDetail, "id">;
      const reminders = await findManyReminders();

      const index = reminders.findIndex((r) => r.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "Reminder not found" });
      }

      const replaced: MaintenanceReminderDetail = { ...reminders[index], ...body };
      reminders[index] = replaced;
      const updated = await updateReminder(replaced);
      if (!updated) {
        return reply.status(404).send({ error: "Reminder not found" });
      }
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/reminders/:id",
    {
      schema: {
        tags: ["Maintenance"],
        summary: "Delete a maintenance reminder",
        params: z.object({ id: z.string().describe("Reminder ID") }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reminders = await findManyReminders();

      const index = reminders.findIndex((r) => r.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "Reminder not found" });
      }

      const deleted = await deleteReminder(id);
      if (!deleted) {
        return reply.status(404).send({ error: "Reminder not found" });
      }
      return reply.send({ success: true });
    },
  );
}
