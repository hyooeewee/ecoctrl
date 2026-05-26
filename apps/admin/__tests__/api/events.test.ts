import { describe, it, expect, vi } from "vitest";
import { eventsApi } from "@/api/events";
import { post } from "@/api/request";

vi.mock("@/api/request", () => ({
  post: vi.fn(),
}));

describe("eventsApi", () => {
  it("fetches SSE token", async () => {
    vi.mocked(post).mockResolvedValue({ token: "sse-token-123", expiresIn: 30 });

    const result = await eventsApi.getToken();

    expect(post).toHaveBeenCalledWith("/events/token");
    expect(result).toEqual({ token: "sse-token-123", expiresIn: 30 });
  });
});
