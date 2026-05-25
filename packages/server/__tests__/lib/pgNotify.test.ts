import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPgNotifyListener, type NotifyCallback } from "@/lib/pgNotify";

describe("createPgNotifyListener", () => {
  let mockSql: { listen: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSql = {
      listen: vi.fn().mockResolvedValue(undefined),
      end: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("should subscribe to channel and invoke callback on notify", async () => {
    const callback: NotifyCallback = vi.fn();
    const listener = createPgNotifyListener(
      mockSql as unknown as Parameters<typeof createPgNotifyListener>[0],
    );

    await listener.start("sse_events", callback);
    expect(mockSql.listen).toHaveBeenCalledWith("sse_events", expect.any(Function));

    // Simulate a NOTIFY payload
    const notifyHandler = mockSql.listen.mock.calls[0][1] as (payload: string) => void;
    notifyHandler('{"type":"alert","payload":{"msg":"test"}}');

    expect(callback).toHaveBeenCalledWith({ type: "alert", payload: { msg: "test" } });
  });

  it("should handle invalid JSON gracefully", async () => {
    const callback: NotifyCallback = vi.fn();
    const listener = createPgNotifyListener(
      mockSql as unknown as Parameters<typeof createPgNotifyListener>[0],
    );

    await listener.start("sse_events", callback);
    const notifyHandler = mockSql.listen.mock.calls[0][1] as (payload: string) => void;

    notifyHandler("not-valid-json");
    expect(callback).not.toHaveBeenCalled();
  });

  it("should stop and end connection", async () => {
    const listener = createPgNotifyListener(
      mockSql as unknown as Parameters<typeof createPgNotifyListener>[0],
    );
    await listener.start("sse_events", vi.fn());
    await listener.stop();
    expect(mockSql.end).toHaveBeenCalled();
  });
});
