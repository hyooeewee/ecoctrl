import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSse } from "@/hooks/useSse";
import { useSseStore } from "@/store/sseStore";
import type { SSEClientOptions } from "@ecoctrl/shared";
import { post } from "@/api/request";

let mockCallbacks: SSEClientOptions | undefined;

vi.mock("@/lib/auth", () => ({
  auth: {
    getAccessToken: () => "test-token",
    setAccessToken: vi.fn(),
    removeAccessToken: vi.fn(),
    getRefreshToken: () => null,
    setRefreshToken: vi.fn(),
    removeRefreshToken: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("@/api/request", () => ({
  post: vi.fn().mockResolvedValue({ token: "sse-token" }),
}));

vi.mock("@ecoctrl/shared", () => ({
  SSEClient: vi.fn().mockImplementation(function (_url: string, options: SSEClientOptions) {
    mockCallbacks = options;
    return {
      connect: vi.fn().mockImplementation(async () => {
        try {
          await options.getToken();
          await Promise.resolve();
          options.onConnect?.();
        } catch (e) {
          options.onError?.(e instanceof Error ? new Event(e.message) : new Event("error"));
          if (options.onTokenError?.(e)) return;
          throw e;
        }
      }),
      disconnect: vi.fn(),
      dispose: vi.fn(),
    };
  }),
}));

describe("useSse", () => {
  beforeEach(() => {
    useSseStore.getState().reset();
    mockCallbacks = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("connects and updates status to connected", async () => {
    renderHook(() => useSse());

    await waitFor(
      () => {
        expect(useSseStore.getState().status).toBe("connected");
      },
      { timeout: 2000 },
    );

    expect(post).toHaveBeenCalledWith("/events/token", undefined, { noReload: true });
  });

  it("dispatches messages to handlers", async () => {
    const { result } = renderHook(() => useSse());

    await waitFor(() => expect(useSseStore.getState().status).toBe("connected"));

    const handler = vi.fn();
    result.current.addHandler(handler);

    mockCallbacks?.onMessage?.({
      type: "alert",
      payload: { severity: "info" },
      timestamp: "2024-01-01T00:00:00Z",
    });

    expect(handler).toHaveBeenCalledWith({
      type: "alert",
      payload: { severity: "info" },
      timestamp: "2024-01-01T00:00:00Z",
    });
  });

  it("updates status on error", async () => {
    renderHook(() => useSse());

    await waitFor(() => expect(useSseStore.getState().status).toBe("connected"));

    mockCallbacks?.onError?.(new Event("error"));

    expect(useSseStore.getState().status).toBe("error");
  });

  it("handles token fetch failure gracefully", async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error("Auth failed"));

    renderHook(() => useSse());

    await waitFor(
      () => {
        expect(useSseStore.getState().status).toBe("error");
      },
      { timeout: 2000 },
    );

    expect(useSseStore.getState().lastError).toBe("Authentication failed");
  });
});
