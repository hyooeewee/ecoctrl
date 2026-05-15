import { describe, it, expect } from "vitest";
import { createAIClient } from "../../src/ai/client";

describe("createAIClient", () => {
  it("throws if AI_PROVIDER is invalid", () => {
    expect(() => createAIClient("invalid" as never, "sk-test")).toThrow("Unsupported AI provider");
  });

  it("returns anthropic client for 'anthropic'", () => {
    const client = createAIClient("anthropic", "sk-test");
    expect(client).toBeDefined();
    expect(typeof client.chat).toBe("function");
  });

  it("returns openai client for 'openai'", () => {
    const client = createAIClient("openai", "sk-test");
    expect(client).toBeDefined();
    expect(typeof client.chat).toBe("function");
  });
});
