import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createAIClient } from "@/ai/client";
import { getToolsForRole, findTool } from "@/ai/tools/registry";
import {
  createConversationMessage,
  findConversationsByUser,
  deleteConversationsByUser,
  findConversationsBySession,
} from "@/repositories/aiConversations";
import { findPetPreferences, upsertPetPreferences } from "@/repositories/petPreferences";
import { errors } from "@/lib/schemas";
import type { ChatMessage, AIStreamChunk } from "@/ai/types";

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    currentPage: z.string(),
    currentRouteData: z.unknown().optional(),
  }),
});

const preferencesBodySchema = z.object({
  theme: z.string().optional(),
  voiceEnabled: z.boolean().optional(),
  voiceSpeed: z.number().optional(),
  petPositionX: z.number().optional(),
  petPositionY: z.number().optional(),
  wakeWordEnabled: z.boolean().optional(),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  const aiProvider = process.env.AI_PROVIDER as "anthropic" | "openai" | undefined;
  const aiApiKey = process.env.AI_API_KEY;
  const aiBaseURL = process.env.AI_BASE_URL;

  if (!aiProvider || !aiApiKey) {
    fastify.log.warn("AI provider not configured. AI chat will return errors.");
  }

  fastify.post(
    "/chat",
    {
      schema: {
        tags: ["AI"],
        summary: "Chat with AI assistant",
        body: chatBodySchema,
        response: { 200: z.any(), ...errors },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: number; role: string } | undefined;
      const userId = user?.id ?? 0;
      const role = user?.role ?? "guest";
      const { message, sessionId, context } = request.body as z.infer<typeof chatBodySchema>;
      const sid = sessionId ?? crypto.randomUUID();

      // Save user message
      await createConversationMessage({
        userId,
        sessionId: sid,
        role: "user",
        content: message,
      });

      // Fetch recent history
      const history = await findConversationsBySession(sid);
      const messages: ChatMessage[] = history.map((h) => ({
        role: h.role as "user" | "assistant" | "tool",
        content: h.content,
        toolCalls: h.toolCalls as unknown as ChatMessage["toolCalls"],
        toolResults: h.toolResults as unknown as ChatMessage["toolResults"],
      }));

      // Get allowed tools
      const tools = getToolsForRole(role);

      // Prepare SSE reply
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      if (!aiProvider || !aiApiKey) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: "error", content: "AI not configured" })}\n\n`,
        );
        reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        reply.raw.end();
        return;
      }

      const client = createAIClient(aiProvider, aiApiKey, aiBaseURL);
      let assistantContent = "";
      const toolCalls: { name: string; arguments: Record<string, unknown> }[] = [];

      try {
        await client.chat(messages, tools, (chunk: AIStreamChunk) => {
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);

          if (chunk.type === "text" && chunk.content) {
            assistantContent += chunk.content;
          }
          if (chunk.type === "tool_call" && chunk.toolCall) {
            toolCalls.push(chunk.toolCall);
          }
        });

        // Execute tools
        for (const tc of toolCalls) {
          const tool = findTool(tc.name);
          if (!tool) continue;

          const result = await tool.handler(tc.arguments, {
            userId,
            role,
            currentPage: context.currentPage,
          });

          const toolResultChunk: AIStreamChunk = {
            type: "tool_result",
            toolResult: { name: tc.name, result },
          };
          reply.raw.write(`data: ${JSON.stringify(toolResultChunk)}\n\n`);

          await createConversationMessage({
            userId,
            sessionId: sid,
            role: "tool",
            content: JSON.stringify(result),
            toolCalls: tc,
            toolResults: { name: tc.name, result },
          });
        }

        // Save assistant response
        if (assistantContent) {
          await createConversationMessage({
            userId,
            sessionId: sid,
            role: "assistant",
            content: assistantContent,
          });
        }

        reply.raw.write(`data: ${JSON.stringify({ type: "done", sessionId: sid })}\n\n`);
      } catch (err) {
        fastify.log.error(err);
        reply.raw.write(
          `data: ${JSON.stringify({ type: "error", content: "AI service error" })}\n\n`,
        );
      }

      reply.raw.end();
    },
  );

  fastify.get(
    "/conversations",
    {
      schema: {
        tags: ["AI"],
        summary: "Get conversation history",
        response: { 200: z.any(), ...errors },
      },
    },
    async (request) => {
      const user = request.user as { id: number } | undefined;
      const userId = user?.id ?? 0;
      const messages = await findConversationsByUser(userId);
      return messages;
    },
  );

  fastify.delete(
    "/conversations",
    {
      schema: {
        tags: ["AI"],
        summary: "Clear conversation history",
        response: { 200: z.object({ success: z.boolean() }), ...errors },
      },
    },
    async (request) => {
      const user = request.user as { id: number } | undefined;
      const userId = user?.id ?? 0;
      await deleteConversationsByUser(userId);
      return { success: true };
    },
  );

  fastify.get(
    "/preferences",
    {
      schema: {
        tags: ["AI"],
        summary: "Get pet preferences",
        response: { 200: z.any(), ...errors },
      },
    },
    async (request) => {
      const user = request.user as { id: number } | undefined;
      const userId = user?.id ?? 0;
      const prefs = await findPetPreferences(userId);
      return (
        prefs ?? {
          userId,
          theme: "tech-robot",
          voiceEnabled: true,
          voiceSpeed: 1.0,
          wakeWordEnabled: true,
        }
      );
    },
  );

  fastify.put(
    "/preferences",
    {
      schema: {
        tags: ["AI"],
        summary: "Update pet preferences",
        body: preferencesBodySchema,
        response: { 200: z.any(), ...errors },
      },
    },
    async (request) => {
      const user = request.user as { id: number } | undefined;
      const userId = user?.id ?? 0;
      const updated = await upsertPetPreferences(
        userId,
        request.body as z.infer<typeof preferencesBodySchema>,
      );
      return updated;
    },
  );
}
