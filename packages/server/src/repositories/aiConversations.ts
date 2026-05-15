import { eq, desc } from "drizzle-orm";
import { db } from "@/config/database";
import { aiConversations } from "@/schemas/aiConversations";
import type { ChatMessage } from "@/ai/types";

interface CreateMessageInput {
  userId: number;
  sessionId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: object;
  toolResults?: object;
}

export async function createConversationMessage(input: CreateMessageInput) {
  const result = await db
    .insert(aiConversations)
    .values({
      userId: input.userId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      toolCalls: input.toolCalls ?? null,
      toolResults: input.toolResults ?? null,
    })
    .returning();
  return result[0];
}

export async function findConversationsByUser(userId: number, limit = 50) {
  return db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.createdAt))
    .limit(limit);
}

export async function findConversationsBySession(sessionId: string) {
  return db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.sessionId, sessionId))
    .orderBy(aiConversations.createdAt);
}

export async function deleteConversationsByUser(userId: number) {
  await db.delete(aiConversations).where(eq(aiConversations.userId, userId));
}
