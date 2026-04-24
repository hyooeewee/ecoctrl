import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { userSettings } from "@/schemas/userSettings";

export async function findUserSettings(userId: string): Promise<Record<string, unknown>> {
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (rows.length === 0) {
    return {};
  }
  return (rows[0].settings as Record<string, unknown>) ?? {};
}

export async function upsertUserSettings(
  userId: string,
  settings: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(userSettings).values({
      userId,
      settings,
      updatedAt: new Date(),
    });
    return settings;
  } else {
    const merged = { ...(existing[0].settings as Record<string, unknown>), ...settings };
    await db
      .update(userSettings)
      .set({
        settings: merged,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));
    return merged;
  }
}
