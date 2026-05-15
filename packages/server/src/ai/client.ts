import type { AIClient } from "./types";
import { AnthropicClient } from "./providers/anthropic";
import { OpenAIClient } from "./providers/openai";

export function createAIClient(provider: "anthropic" | "openai", apiKey: string): AIClient {
  switch (provider) {
    case "anthropic":
      return new AnthropicClient(apiKey);
    case "openai":
      return new OpenAIClient(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
