import { describe, it, expect, vi, beforeEach } from "vitest";
import { SSEManager } from "@/sse/manager";

describe("SSE integration", () => {
  let manager: SSEManager;

  beforeEach(() => {
    manager = new SSEManager();
  });

  it("broadcasts to all connections", () => {
    const write1 = vi.fn();
    const write2 = vi.fn();
    manager.add("user-1", { raw: { write: write1 } as unknown as NodeJS.WritableStream });
    manager.add("user-2", { raw: { write: write2 } as unknown as NodeJS.WritableStream });

    manager.broadcast({
      type: "alert",
      payload: { msg: "hello" },
      timestamp: new Date().toISOString(),
    });

    expect(write1).toHaveBeenCalledTimes(1);
    expect(write2).toHaveBeenCalledTimes(1);
  });

  it("scoped broadcast with _targetUserId sends only to matching user", () => {
    const write1 = vi.fn();
    const write2 = vi.fn();
    manager.add("user-1", { raw: { write: write1 } as unknown as NodeJS.WritableStream });
    manager.add("user-2", { raw: { write: write2 } as unknown as NodeJS.WritableStream });

    manager.broadcast(
      {
        type: "notification",
        payload: { _targetUserId: "user-1", title: "Hi" },
        timestamp: new Date().toISOString(),
      },
      "user-1",
    );

    expect(write1).toHaveBeenCalledTimes(1);
    expect(write2).not.toHaveBeenCalled();
  });

  it("writes valid SSE format to output", () => {
    const write = vi.fn();
    manager.add("user-1", { raw: { write } as unknown as NodeJS.WritableStream });

    manager.broadcast({
      type: "alert",
      payload: { msg: "hello" },
      timestamp: "2024-01-01T00:00:00Z",
    });

    const written = write.mock.calls[0][0] as string;
    const lines = written.split("\n");

    expect(lines.some((l) => l.startsWith('data: {"type":"alert"'))).toBe(true);
    expect(lines.some((l) => l.startsWith("data: "))).toBe(true);
    expect(written).toMatch(/data: .*"msg":"hello"/);
    expect(written).toMatch(/\n\n$/);
  });
});
