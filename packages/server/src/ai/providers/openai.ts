import OpenAI from "openai";
import type { AIClient, ChatMessage, Tool, AIStreamChunk } from "../types";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export class OpenAIClient implements AIClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model || DEFAULT_OPENAI_MODEL;
  }

  async chat(
    messages: ChatMessage[],
    tools: Tool[],
    onChunk: (chunk: AIStreamChunk) => void,
  ): Promise<void> {
    const openaiMessages = messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool" as const,
          content: m.content,
          tool_call_id: m.toolResults?.[0]?.name ?? "unknown",
        };
      }
      if (m.toolCalls) {
        return {
          role: "assistant" as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.name,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      return { role: m.role, content: m.content };
    });

    const openaiTools = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      },
    }));

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        stream: true,
      });

      const toolCallBuffers: { id: string; name: string; args: string }[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          onChunk({ type: "text", content: delta.content });
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallBuffers[idx]) {
              toolCallBuffers[idx] = { id: "", name: "", args: "" };
            }
            if (tc.id) toolCallBuffers[idx].id = tc.id;
            if (tc.function?.name) toolCallBuffers[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallBuffers[idx].args += tc.function.arguments;
          }
        }
      }

      // Emit collected tool calls after stream ends
      for (const tc of toolCallBuffers) {
        if (tc.name) {
          try {
            const args = tc.args ? JSON.parse(tc.args) : {};
            onChunk({ type: "tool_call", toolCall: { name: tc.name, arguments: args } });
          } catch {
            onChunk({ type: "tool_call", toolCall: { name: tc.name, arguments: {} } });
          }
        }
      }

      onChunk({ type: "done" });
    } catch (err) {
      onChunk({ type: "error", content: err instanceof Error ? err.message : "OpenAI error" });
      onChunk({ type: "done" });
    }
  }
}
