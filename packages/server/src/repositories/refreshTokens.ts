import { eq, and, gt } from "drizzle-orm";
import { db } from "@/config/database";
import { refreshTokens } from "@/schemas/refreshTokens";

export async function createRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
  });
}

export async function findValidRefreshToken(tokenHash: string) {
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function deleteRefreshTokenById(id: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.id, id));
}

export async function deleteRefreshTokensByUserId(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
