import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPluginApi } from "@/engine/plugin-api";
import * as notifyTrigger from "@/lib/notifyTrigger";

vi.mock("@/lib/notifyTrigger", () => ({
  emitEvent: vi.fn(),
}));

describe("plugin-api notify.send", () => {
  let api: ReturnType<typeof createPluginApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    api = createPluginApi(
      { variables: new Map(), triggerData: {} } as unknown as Parameters<typeof createPluginApi>[0],
      "wf-1",
      "exec-1",
      "node-1",
      "TestNode",
      null,
      false,
    );
  });

  it("emits notification event with correct payload", async () => {
    await api.notify.send({
      title: "Test Title",
      content: "Test Content",
      level: "warning",
    });

    expect(notifyTrigger.emitEvent).toHaveBeenCalledTimes(1);
    expect(notifyTrigger.emitEvent).toHaveBeenCalledWith("notification", {
      title: "Test Title",
      content: "Test Content",
      level: "warning",
    });
  });

  it("adds _targetUserId when to array provided", async () => {
    await api.notify.send({
      title: "Private",
      content: "For you",
      to: ["user-123"],
    });

    expect(notifyTrigger.emitEvent).toHaveBeenCalledWith("notification", {
      title: "Private",
      content: "For you",
      level: "info",
      _targetUserId: "user-123",
    });
  });

  it("defaults level to info", async () => {
    await api.notify.send({
      title: "Hello",
      content: "World",
    });

    const payload = (notifyTrigger.emitEvent as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.level).toBe("info");
  });
});
