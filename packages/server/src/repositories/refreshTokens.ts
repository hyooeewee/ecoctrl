import { eq, and, gt } from "drizzle-orm";
import { db } from "@/config/database";
import { refreshTokens } from "@/schemas/refreshTokens";

export async function createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
  const result = await db
    .insert(refreshTokens)
    .values({
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function findValidRefreshToken(tokenHash: string) {
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteRefreshToken(tokenHash: string) {
  const result = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .returning();
  return result[0] ?? null;
}

export async function deleteRefreshTokenById(id: string) {
  const result = await db.delete(refreshTokens).where(eq(refreshTokens.id, id)).returning();
  return result[0] ?? null;
}

export async function deleteRefreshTokensByUserId(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
