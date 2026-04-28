import { eq } from "drizzle-orm";
import type { MaintenanceReminderDetail } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { maintenanceReminders } from "@/schemas/maintenance";

export async function findManyReminders(): Promise<MaintenanceReminderDetail[]> {
  const rows = await db.select().from(maintenanceReminders);
  return rows.map((r) => ({
    id: r.id,
    task: r.task,
    description: r.description ?? "",
    dueDate: r.dueDate,
    priority: r.priority as "high" | "medium" | "low",
    status: r.status as "pending" | "in_progress" | "completed" | "overdue",
    assignee: r.assignee ?? "",
    location: r.location ?? "",
    estimatedHours: r.estimatedHours ?? 0,
    lastCompleted: r.lastCompleted ?? null,
  }));
}

export async function updateReminder(
  data: Partial<MaintenanceReminderDetail> & { id: string },
): Promise<MaintenanceReminderDetail | null> {
  const result = await db
    .update(maintenanceReminders)
    .set(data)
    .where(eq(maintenanceReminders.id, data.id))
    .returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    task: r.task,
    description: r.description ?? "",
    dueDate: r.dueDate,
    priority: r.priority as "high" | "medium" | "low",
    status: r.status as "pending" | "in_progress" | "completed" | "overdue",
    assignee: r.assignee ?? "",
    location: r.location ?? "",
    estimatedHours: r.estimatedHours ?? 0,
    lastCompleted: r.lastCompleted ?? null,
  };
}

export async function deleteReminder(id: string): Promise<MaintenanceReminderDetail | null> {
  const result = await db
    .delete(maintenanceReminders)
    .where(eq(maintenanceReminders.id, id))
    .returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    task: r.task,
    description: r.description ?? "",
    dueDate: r.dueDate,
    priority: r.priority as "high" | "medium" | "low",
    status: r.status as "pending" | "in_progress" | "completed" | "overdue",
    assignee: r.assignee ?? "",
    location: r.location ?? "",
    estimatedHours: r.estimatedHours ?? 0,
    lastCompleted: r.lastCompleted ?? null,
  };
}
