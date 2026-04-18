import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import type { MaintenanceReminder, MaintenanceReminderDetail } from "../types/index.js";
import { getReminders, saveData } from "../db/maintenance.js";

const reminderItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    task: { type: "string" },
    dueDate: { type: "string" },
    priority: { type: "string" },
  },
};

const reminderDetailSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    task: { type: "string" },
    description: { type: "string" },
    dueDate: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    status: { type: "string", enum: ["pending", "in_progress", "completed", "overdue"] },
    assignee: { type: "string" },
    location: { type: "string" },
    estimatedHours: { type: "number" },
    lastCompleted: { type: "string", nullable: true },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

const createBodySchema = {
  type: "object",
  required: ["task", "dueDate"],
  properties: {
    task: { type: "string" },
    description: { type: "string" },
    dueDate: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    status: { type: "string", enum: ["pending", "in_progress", "completed", "overdue"] },
    assignee: { type: "string" },
    location: { type: "string" },
    estimatedHours: { type: "number" },
    lastCompleted: { type: "string" },
  },
};

const replaceBodySchema = {
  type: "object",
  required: ["task", "description", "dueDate", "priority", "status", "assignee", "location", "estimatedHours"],
  properties: {
    task: { type: "string" },
    description: { type: "string" },
    dueDate: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    status: { type: "string", enum: ["pending", "in_progress", "completed", "overdue"] },
    assignee: { type: "string" },
    location: { type: "string" },
    estimatedHours: { type: "number" },
    lastCompleted: { type: "string" },
  },
};

export default async function maintenanceRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/reminders",
    {
      schema: {
        summary: "Get maintenance reminders list",
        response: {
          200: {
            type: "array",
            items: reminderItemSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const reminders = getReminders();
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
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Reminder ID" },
          },
          required: ["id"],
        },
        response: {
          200: reminderDetailSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reminder = getReminders().find((r) => r.id === id);
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
        response: {
          201: reminderDetailSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Partial<MaintenanceReminderDetail>;
      const reminders = getReminders();

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
      saveData(reminders);
      return reply.status(201).send(newReminder);
    },
  );

  fastify.put(
    "/reminders/:id",
    {
      schema: {
        summary: "Replace a maintenance reminder",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Reminder ID" },
          },
          required: ["id"],
        },
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
      const reminders = getReminders();

      const index = reminders.findIndex((r) => r.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "Reminder not found" });
      }

      const replaced: MaintenanceReminderDetail = { id, ...body };
      reminders[index] = replaced;
      saveData(reminders);
      return reply.send(replaced);
    },
  );

  fastify.delete(
    "/reminders/:id",
    {
      schema: {
        summary: "Delete a maintenance reminder",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Reminder ID" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
          },
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reminders = getReminders();

      const index = reminders.findIndex((r) => r.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "Reminder not found" });
      }

      reminders.splice(index, 1);
      saveData(reminders);
      return reply.send({ success: true });
    },
  );
}
