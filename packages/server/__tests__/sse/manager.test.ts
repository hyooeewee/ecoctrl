import { describe, it, expect, vi, beforeEach } from "vitest";
import { SSEManager } from "@/sse/manager";

describe("SSEManager", () => {
  let manager: SSEManager;

  beforeEach(() => {
    manager = new SSEManager();
  });

  it("should add and track a connection", () => {
    const write = vi.fn();
    const conn = manager.add("user-1", { raw: { write } as unknown as NodeJS.WritableStream });

    expect(conn.userId).toBe("user-1");
    expect(manager.count()).toBe(1);
  });

  it("should remove a connection by id", () => {
    const write = vi.fn();
    const conn = manager.add("user-1", { raw: { write } as unknown as NodeJS.WritableStream });
    manager.remove(conn.id);

    expect(manager.count()).toBe(0);
  });

  it("should broadcast to all connections", () => {
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

  it("should send only to matching userId", () => {
    const write1 = vi.fn();
    const write2 = vi.fn();
    manager.add("user-1", { raw: { write: write1 } as unknown as NodeJS.WritableStream });
    manager.add("user-2", { raw: { write: write2 } as unknown as NodeJS.WritableStream });

    manager.sendToUser("user-1", {
      type: "alert",
      payload: { msg: "hello" },
      timestamp: new Date().toISOString(),
    });

    expect(write1).toHaveBeenCalledTimes(1);
    expect(write2).not.toHaveBeenCalled();
  });

  it("should write SSE format", () => {
    const write = vi.fn();
    manager.add("user-1", { raw: { write } as unknown as NodeJS.WritableStream });

    manager.broadcast({
      type: "alert",
      payload: { msg: "hello" },
      timestamp: "2024-01-01T00:00:00Z",
    });

    const written = write.mock.calls[0][0] as string;
    expect(written).toContain("event: alert");
    expect(written).toContain('"msg":"hello"');
    expect(written).toContain("data:");
    expect(written).toContain("\n\n");
  });
});
