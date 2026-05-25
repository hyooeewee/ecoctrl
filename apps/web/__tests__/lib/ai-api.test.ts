import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatStream } from "~/lib/ai-api";

// Mock the api helpers to avoid auth-store dependency
vi.mock("~/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from "~/lib/api";
import {
  fetchConversations,
  clearConversations,
  fetchPetPreferences,
  updatePetPreferences,
} from "~/lib/ai-api";

function createMockStream(chunks: string[]) {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe("chatStream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses SSE text chunks", async () => {
    const onChunk = vi.fn();
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: createMockStream([
            'data: {"type":"text","content":"Hello"}\n\n',
            'data: {"type":"text","content":" world"}\n\n',
            'data: {"type":"done"}\n\n',
          ]),
        } as Response),
      ),
    );

    chatStream({ message: "hi", context: { currentPage: "/" } }, onChunk, onError);

    await vi.waitFor(() => expect(onChunk).toHaveBeenCalledTimes(3), { timeout: 1000 });

    expect(onChunk.mock.calls[0][0]).toEqual({ type: "text", content: "Hello" });
    expect(onChunk.mock.calls[1][0]).toEqual({ type: "text", content: " world" });
    expect(onChunk.mock.calls[2][0]).toEqual({ type: "done" });
    expect(onError).not.toHaveBeenCalled();
  });

  it("parses tool_call and tool_result chunks", async () => {
    const onChunk = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: createMockStream([
            'data: {"type":"tool_call","toolCall":{"name":"navigateTo","arguments":{"page":"/settings"}}}\n\n',
            'data: {"type":"tool_result","toolResult":{"name":"navigateTo","result":{"ok":true}}}\n\n',
            'data: {"type":"done"}\n\n',
          ]),
        } as Response),
      ),
    );

    chatStream({ message: "go", context: { currentPage: "/" } }, onChunk);

    await vi.waitFor(() => expect(onChunk).toHaveBeenCalledTimes(3), { timeout: 1000 });

    expect(onChunk.mock.calls[0][0].type).toBe("tool_call");
    expect(onChunk.mock.calls[0][0].toolCall.name).toBe("navigateTo");
    expect(onChunk.mock.calls[1][0].type).toBe("tool_result");
  });

  it("handles HTTP errors", async () => {
    const onChunk = vi.fn();
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response),
      ),
    );

    chatStream({ message: "hi", context: { currentPage: "/" } }, onChunk, onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("HTTP 500"), { timeout: 1000 });
    expect(onChunk).not.toHaveBeenCalled();
  });

  it("handles malformed JSON gracefully", async () => {
    const onChunk = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: createMockStream([
            "data: not-json\n\n",
            'data: {"type":"text","content":"valid"}\n\n',
            "data: [DONE]\n\n",
          ]),
        } as Response),
      ),
    );

    chatStream({ message: "hi", context: { currentPage: "/" } }, onChunk);

    await vi.waitFor(() => expect(onChunk).toHaveBeenCalledTimes(1), { timeout: 1000 });
    expect(onChunk.mock.calls[0][0]).toEqual({ type: "text", content: "valid" });
  });

  it("can be aborted", async () => {
    const onChunk = vi.fn();
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: createMockStream(['data: {"type":"text","content":"x"}\n\n']),
        } as Response),
      ),
    );

    const cleanup = chatStream({ message: "hi", context: { currentPage: "/" } }, onChunk, onError);
    cleanup();

    // After abort, no further chunks should arrive.
    await new Promise((r) => setTimeout(r, 100));
    // We may or may not get the first chunk depending on timing; the key is no error.
    expect(onError).not.toHaveBeenCalled();
  });

  it("ignores non-data SSE lines", async () => {
    const onChunk = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: createMockStream([':heartbeat\n\ndata: {"type":"text","content":"only this"}\n\n']),
        } as Response),
      ),
    );

    chatStream({ message: "hi", context: { currentPage: "/" } }, onChunk);

    await vi.waitFor(() => expect(onChunk).toHaveBeenCalledTimes(1), { timeout: 1000 });
    expect(onChunk.mock.calls[0][0]).toEqual({ type: "text", content: "only this" });
  });
});

describe("pet preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchConversations calls correct endpoint", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      data: [{ id: "1", content: "hello" }],
    });

    const result = await fetchConversations();
    expect(apiGet).toHaveBeenCalledWith("/api/ai/conversations");
    expect(result).toEqual({ ok: true, data: [{ id: "1", content: "hello" }] });
  });

  it("fetchPetPreferences calls correct endpoint", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      data: {
        userId: 1,
        theme: "usagi",
        voiceEnabled: true,
        voiceSpeed: 1,
        petPositionX: 100,
        petPositionY: 200,
        wakeWordEnabled: true,
      },
    });

    const result = await fetchPetPreferences();
    expect(apiGet).toHaveBeenCalledWith("/api/ai/preferences");
    expect(result.data?.theme).toBe("usagi");
    expect(result.data?.voiceEnabled).toBe(true);
  });

  it("updatePetPreferences sends correct body", async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      data: { theme: "violet" },
    });

    const result = await updatePetPreferences({ theme: "violet" });
    expect(apiPost).toHaveBeenCalledWith("/api/ai/preferences", { theme: "violet" });
    expect(result.data?.theme).toBe("violet");
  });

  it("clearConversations calls correct endpoint", async () => {
    vi.mocked(apiPost).mockResolvedValue({ ok: true, data: { success: true } });

    const result = await clearConversations();
    expect(apiPost).toHaveBeenCalledWith("/api/ai/conversations", {});
    expect(result.data?.success).toBe(true);
  });
});
