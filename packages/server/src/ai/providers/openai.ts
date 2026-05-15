import type { AIClient, ChatMessage, Tool, AIStreamChunk } from "../types";

export class OpenAIClient implements AIClient {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async chat(
    _messages: ChatMessage[],
    _tools: Tool[],
    onChunk: (chunk: AIStreamChunk) => void,
  ): Promise<void> {
    onChunk({ type: "error", content: "OpenAI provider not yet fully implemented" });
    onChunk({ type: "done" });
  }
}
