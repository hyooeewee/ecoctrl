import { describe, it, expect } from "vitest";
import { AnthropicClient } from "../../../src/ai/providers/anthropic";

describe("AnthropicClient", () => {
  it("has a chat method", () => {
    const client = new AnthropicClient("sk-test");
    expect(typeof client.chat).toBe("function");
  });
});
