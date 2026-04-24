import { z } from "zod";

// Simplified reminder returned by list endpoint
export const MaintenanceReminderSchema = z.object({
  id: z.string(),
  task: z.string(),
  dueDate: z.string(),
  priority: z.string(),
});
export type MaintenanceReminder = z.infer<typeof MaintenanceReminderSchema>;

// Full reminder detail returned by create / update / detail endpoints
export const MaintenanceReminderDetailSchema = z.object({
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
export type MaintenanceReminderDetail = z.infer<typeof MaintenanceReminderDetailSchema>;
