import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { petPreferences } from "@/schemas/petPreferences";

export async function findPetPreferences(userId: number) {
  const rows = await db
    .select()
    .from(petPreferences)
    .where(eq(petPreferences.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPetPreferences(
  userId: number,
  updates: Partial<{
    theme: string;
    voiceEnabled: boolean;
    voiceSpeed: number;
    petPositionX: number;
    petPositionY: number;
    wakeWordEnabled: boolean;
  }>,
) {
  const existing = await findPetPreferences(userId);
  if (existing) {
    const result = await db
      .update(petPreferences)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(petPreferences.userId, userId))
      .returning();
    return result[0];
  }

  const result = await db
    .insert(petPreferences)
    .values({
      userId,
      theme: updates.theme ?? "tech-robot",
      voiceEnabled: updates.voiceEnabled ?? true,
      voiceSpeed: updates.voiceSpeed ?? 1.0,
      petPositionX: updates.petPositionX ?? null,
      petPositionY: updates.petPositionY ?? null,
      wakeWordEnabled: updates.wakeWordEnabled ?? true,
    })
    .returning();
  return result[0];
}
