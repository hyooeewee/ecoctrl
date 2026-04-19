import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { maintenanceReminders } from "@/schemas/maintenance";
import type { MaintenanceReminderDetail, MaintenanceReminder } from "@/types/index";

export async function getReminders(): Promise<MaintenanceReminderDetail[]> {
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
    lastCompleted: r.lastCompleted ?? undefined,
  }));
}

export async function updateReminder(data: Partial<MaintenanceReminderDetail> & { id: string }): Promise<void> {
  await db.update(maintenanceReminders).set(data).where(eq(maintenanceReminders.id, data.id));
}

export async function deleteReminder(id: string): Promise<boolean> {
  const result = await db.delete(maintenanceReminders).where(eq(maintenanceReminders.id, id)).returning();
  return result.length > 0;
}
