import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import type { MaintenanceReminder, MaintenanceReminderDetail } from "@/types/index";
import { getReminders, updateReminder, deleteReminder } from "@/repositories/maintenance";

const reminderItemSchema = z.object({
  id: z.string(),
  task: z.string(),
  dueDate: z.string(),
  priority: z.string(),
});

const reminderDetailSchema = z.object({
  id: z.string(),
  task: z.string(),
  description: z.string(),
  dueDate: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]),
  assignee: z.string(),
  location: z.string(),
  estimatedHours: z.number(),
  lastCompleted: z.string().nullable(),
});

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
        summary: "Get maintenance reminders list",
        response: { 200: z.array(reminderItemSchema) },
      },
    },
    async (_request, reply) => {
      const reminders = await getReminders();
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
        summary: "Get maintenance reminder detail",
        params: z.object({ id: z.string().describe("Reminder ID") }),
        response: {
          200: reminderDetailSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reminders = await getReminders();
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
        summary: "Create a maintenance reminder",
        body: createBodySchema,
        response: { 201: reminderDetailSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as Partial<MaintenanceReminderDetail>;
      const reminders = await getReminders();

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
        lastCompleted: body.lastCompleted,
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
        summary: "Replace a maintenance reminder",
        params: z.object({ id: z.string().describe("Reminder ID") }),
        body: replaceBodySchema,
        response: {
          200: reminderDetailSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Omit<MaintenanceReminderDetail, "id">;
      const reminders = await getReminders();

      const index = reminders.findIndex((r) => r.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "Reminder not found" });
      }

      const replaced: MaintenanceReminderDetail = { ...reminders[index], ...body };
      reminders[index] = replaced;
      await updateReminder(replaced);
      return reply.send(replaced);
    },
  );

  fastify.delete(
    "/reminders/:id",
    {
      schema: {
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
      const reminders = await getReminders();

      const index = reminders.findIndex((r) => r.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "Reminder not found" });
      }

      const ok = await deleteReminder(id);
      if (!ok) {
        return reply.status(404).send({ error: "Reminder not found" });
      }
      return reply.send({ success: true });
    },
  );
}
