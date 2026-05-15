import type { AIClient, ChatMessage, Tool, AIStreamChunk } from "../types";

export class OpenAIClient implements AIClient {
  private apiKey: string;
  private baseURL?: string;
  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
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
