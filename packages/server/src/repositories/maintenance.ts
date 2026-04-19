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

export async function saveData(data: MaintenanceReminderDetail[]): Promise<void> {
  // Simple approach: delete all then re-insert
  await db.delete(maintenanceReminders);
  if (data.length) {
    await db.insert(maintenanceReminders).values(
      data.map((d) => ({
        id: d.id,
        task: d.task,
        description: d.description,
        dueDate: d.dueDate,
        priority: d.priority,
        status: d.status,
        assignee: d.assignee,
        location: d.location,
        estimatedHours: d.estimatedHours,
        lastCompleted: d.lastCompleted,
      })),
    );
  }
}
