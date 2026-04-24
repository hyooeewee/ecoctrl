import { eq, and } from "drizzle-orm";
import { db } from "@/config/database";
import { oauthAccounts } from "@/schemas/oauthAccounts";

export interface OAuthAccountInput {
  userId: string;
  provider: string;
  providerUserId: string;
  providerEmail?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}

export async function findOAuthAccount(
  provider: string,
  providerUserId: string,
) {
  const rows = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerUserId, providerUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createOAuthAccount(data: OAuthAccountInput) {
  const result = await db
    .insert(oauthAccounts)
    .values({
      userId: data.userId,
      provider: data.provider,
      providerUserId: data.providerUserId,
      providerEmail: data.providerEmail ?? null,
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
    })
    .returning();
  return result[0];
}

export async function unlinkOAuthAccount(userId: string, provider: string) {
  const result = await db
    .delete(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.userId, userId),
        eq(oauthAccounts.provider, provider),
      ),
    )
    .returning();
  return result[0] ?? null;
}

export async function findUserOAuthAccounts(userId: string) {
  return db
    .select({
      provider: oauthAccounts.provider,
      providerUserId: oauthAccounts.providerUserId,
      providerEmail: oauthAccounts.providerEmail,
      createdAt: oauthAccounts.createdAt,
    })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId));
}
