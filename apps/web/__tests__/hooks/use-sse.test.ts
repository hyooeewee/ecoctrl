import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSse } from "~/hooks/use-sse";
import type { SSEClientOptions } from "~/lib/sse";

// Capture callbacks from SSEClient constructor to simulate events
let mockCallbacks: SSEClientOptions | undefined;

vi.mock("~/lib/sse", () => ({
  SSEClient: vi.fn().mockImplementation(function (_url: string, options: SSEClientOptions) {
    mockCallbacks = options;
    return {
      connect: vi.fn().mockImplementation(async () => {
        // Simulate async connect that triggers onConnect callback
        await Promise.resolve();
        options.onConnect?.();
      }),
      disconnect: vi.fn(),
      dispose: vi.fn(),
    };
  }),
}));

describe("useSse", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should initialize with disconnected state", () => {
    const { result } = renderHook(() => useSse({ url: "/api/events" }));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.lastMessage).toBeNull();
  });

  it("should connect when enabled is true", async () => {
    const { result } = renderHook(() => useSse({ url: "/api/events", enabled: true }));
    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });
});
