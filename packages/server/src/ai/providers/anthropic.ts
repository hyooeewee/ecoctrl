import Anthropic from "@anthropic-ai/sdk";
import type { AIClient, ChatMessage, Tool, AIStreamChunk } from "../types";

export class AnthropicClient implements AIClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(
    messages: ChatMessage[],
    tools: Tool[],
    onChunk: (chunk: AIStreamChunk) => void,
  ): Promise<void> {
    const anthropicTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: m.toolResults?.[0]?.name ?? "",
              content: JSON.stringify(m.toolResults?.[0]?.result ?? ""),
            },
          ],
        };
      }
      if (m.toolCalls) {
        return {
          role: "assistant" as const,
          content: m.toolCalls.map((tc) => ({
            type: "tool_use" as const,
            id: tc.name,
            name: tc.name,
            input: tc.arguments,
          })),
        };
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      };
    });

    const stream = this.client.messages.stream({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: anthropicMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        onChunk({ type: "text", content: event.delta.text });
      }
      if (event.type === "content_block_stop" && event.content_block.type === "tool_use") {
        onChunk({
          type: "tool_call",
          toolCall: {
            name: event.content_block.name,
            arguments: event.content_block.input as Record<string, unknown>,
          },
        });
      }
    }

    onChunk({ type: "done" });
  }
}
