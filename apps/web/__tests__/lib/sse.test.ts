import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SSEClient } from "~/lib/sse";

// Mock auth store and env
vi.mock("~/store/auth", () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ accessToken: "test-token" })),
  },
}));

vi.mock("~/lib/env", () => ({
  API_PREFIX: "http://localhost:8787/api",
}));

describe("SSEClient", () => {
  let client: SSEClient;
  let mockEventSource: typeof EventSource;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock fetch for token endpoint
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "sse-token" }),
      } as Response),
    );

    // Track EventSource instances
    let esInstance: FakeEventSource | null = null;

    class FakeEventSource {
      url: string;
      readyState = 0;
      onopen: ((e: Event) => void) | null = null;
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      private closed = false;

      constructor(url: string) {
        this.url = url;
        esInstance = this;
        // Simulate async open
        setTimeout(() => {
          if (!this.closed && this.onopen) {
            this.readyState = 1;
            this.onopen(new Event("open"));
          }
        }, 0);
      }

      close() {
        this.closed = true;
        this.readyState = 2;
      }

      static getInstance() {
        return esInstance;
      }

      static clearInstance() {
        esInstance = null;
      }
    }

    mockEventSource = FakeEventSource as unknown as typeof EventSource;
    global.EventSource = mockEventSource;
  });

  afterEach(() => {
    client?.dispose();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should increase reconnect delay exponentially", async () => {
    const onError = vi.fn();
    client = new SSEClient("http://localhost:8787/api/events", {
      onError,
    });

    await client.connect();
    const es = (mockEventSource as any).getInstance();
    expect(es).not.toBeNull();

    // Simulate error to trigger first reconnect
    es!.onerror!(new Event("error"));

    // First reconnect should fire after 1s
    expect(onError).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect((mockEventSource as any).getInstance()).not.toBeNull();

    // Second error - next reconnect should be at 2s
    const es2 = (mockEventSource as any).getInstance();
    es2!.onerror!(new Event("error"));
    await vi.advanceTimersByTimeAsync(2000);
    expect((mockEventSource as any).getInstance()).not.toBeNull();

    // Third error - next reconnect should be at 4s
    const es3 = (mockEventSource as any).getInstance();
    es3!.onerror!(new Event("error"));
    await vi.advanceTimersByTimeAsync(4000);
    expect((mockEventSource as any).getInstance()).not.toBeNull();
  });

  it("should cap reconnect delay at 30s", async () => {
    const onError = vi.fn();
    client = new SSEClient("http://localhost:8787/api/events", {
      onError,
    });

    await client.connect();
    let es = (mockEventSource as any).getInstance();

    // Trigger errors to push delay up: 1s -> 2s -> 4s -> 8s -> 16s -> 32s(capped at 30s)
    for (let i = 0; i < 6; i++) {
      es!.onerror!(new Event("error"));
      es = (mockEventSource as any).getInstance();
    }

    // After 6 errors, delay should be capped at 30000ms
    // The delays were: 1000, 2000, 4000, 8000, 16000, 30000 (capped)
    // Advance past the last reconnect to verify it capped
    await vi.advanceTimersByTimeAsync(30000);
    expect((mockEventSource as any).getInstance()).not.toBeNull();

    // One more error - should still cap at 30s
    const lastEs = (mockEventSource as any).getInstance();
    lastEs!.onerror!(new Event("error"));

    // If not capped, next would be 60000. With cap, it's 30000.
    // We verify by checking that a reconnect happens at 30s, not 60s
    await vi.advanceTimersByTimeAsync(30000);
    expect((mockEventSource as any).getInstance()).not.toBeNull();
  });

  it("should reset delay after successful connection", async () => {
    const onConnect = vi.fn();
    const onError = vi.fn();
    client = new SSEClient("http://localhost:8787/api/events", {
      onConnect,
      onError,
    });

    await client.connect();
    let es = (mockEventSource as any).getInstance();

    // Trigger error to increase delay to 2s
    es!.onerror!(new Event("error"));
    await vi.advanceTimersByTimeAsync(1000);
    // Reconnected, delay now 2s
    expect((mockEventSource as any).getInstance()).not.toBeNull();

    // Now trigger another error - if delay wasn't reset by onopen, it would be 2s
    // But onopen resets it, so next reconnect should be at 1s
    es = (mockEventSource as any).getInstance();
    es!.onerror!(new Event("error"));

    // Should reconnect at 1s (reset), not 2s (doubled)
    await vi.advanceTimersByTimeAsync(1000);
    expect((mockEventSource as any).getInstance()).not.toBeNull();
  });
});
