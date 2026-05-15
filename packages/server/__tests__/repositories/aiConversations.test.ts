import { describe, it, expect } from "vitest";
import {
  createConversationMessage,
  findConversationsByUser,
} from "../../src/repositories/aiConversations";

describe("aiConversations repository", () => {
  it("createConversationMessage returns the created message", async () => {
    const msg = await createConversationMessage({
      userId: 1,
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      role: "user",
      content: "Hello",
    });
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
  });

  it("findConversationsByUser returns array", async () => {
    const messages = await findConversationsByUser(1);
    expect(Array.isArray(messages)).toBe(true);
  });
});
