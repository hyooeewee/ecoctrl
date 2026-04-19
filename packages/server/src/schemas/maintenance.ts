import { pgTable, uuid, varchar, text, integer, date } from "drizzle-orm/pg-core";

export const maintenanceReminders = pgTable("maintenance_reminders", {
  id: uuid("id").primaryKey(),
  task: varchar("task", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date").notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  assignee: varchar("assignee", { length: 100 }),
  location: varchar("location", { length: 255 }),
  estimatedHours: integer("estimated_hours").default(0),
  lastCompleted: date("last_completed"),
});
