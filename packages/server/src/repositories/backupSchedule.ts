import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { backupSchedules } from "@/schemas/backupSchedule";

export async function getBackupSchedule(): Promise<{ nextBackup: string } | null> {
  const rows = await db.select().from(backupSchedules).limit(1);
  if (rows.length === 0) return null;
  return { nextBackup: rows[0].nextBackup };
}

export async function setBackupSchedule(nextBackup: string): Promise<void> {
  const rows = await db.select().from(backupSchedules).limit(1);
  if (rows.length === 0) {
    await db.insert(backupSchedules).values({ nextBackup });
  } else {
    await db.update(backupSchedules).set({ nextBackup }).where(eq(backupSchedules.id, rows[0].id));
  }
}
