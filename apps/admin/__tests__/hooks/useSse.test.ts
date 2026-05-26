import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSse } from "@/hooks/useSse";
import { eventsApi } from "@/api/events";
import { useSseStore } from "@/store/sseStore";

vi.mock("@/api/events", () => ({
  eventsApi: { getToken: vi.fn() },
}));

describe("useSse", () => {
  let mockEventSource: { onmessage: ((e: MessageEvent) => void) | null; close: () => void };

  beforeEach(() => {
    useSseStore.getState().reset();
    mockEventSource = { onmessage: null, close: vi.fn() };
    global.EventSource = vi.fn(() => mockEventSource) as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("connects and updates status to connecting", async () => {
    vi.mocked(eventsApi.getToken).mockResolvedValue({ token: "tok", expiresIn: 30 });

    renderHook(() => useSse());

    await waitFor(
      () => {
        expect(useSseStore.getState().status).toBe("connecting");
      },
      { timeout: 2000 },
    );
  });
});
