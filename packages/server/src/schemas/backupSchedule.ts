import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const backupSchedules = pgTable("backup_schedules", {
  id: serial("id").primaryKey(),
  nextBackup: varchar("next_backup", { length: 50 }).notNull(),
});
