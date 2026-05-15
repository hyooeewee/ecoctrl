import { apiGet, apiPost } from "./api";

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context: {
    currentPage: string;
    currentRouteData?: unknown;
  };
}

export interface ChatChunk {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  content?: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  toolResult?: {
    name: string;
    result: unknown;
  };
  sessionId?: string;
}

export interface PetPreferences {
  userId: number;
  theme: string;
  voiceEnabled: boolean;
  voiceSpeed: number;
  petPositionX: number | null;
  petPositionY: number | null;
  wakeWordEnabled: boolean;
}

export function chatStream(
  request: ChatRequest,
  onChunk: (chunk: ChatChunk) => void,
  onError?: (error: string) => void,
): () => void {
  const abortController = new AbortController();

  const run = async () => {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        onError?.(`HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") continue;
          try {
            const chunk = JSON.parse(jsonStr) as ChatChunk;
            onChunk(chunk);
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError?.((err as Error).message);
      }
    }
  };

  void run();
  return () => abortController.abort();
}

export async function fetchConversations() {
  return apiGet<
    Array<{
      id: string;
      userId: number;
      sessionId: string;
      role: string;
      content: string;
      createdAt: string;
    }>
  >("/api/ai/conversations");
}

export async function clearConversations() {
  return apiPost<{ success: boolean }>("/api/ai/conversations", {});
}

export async function fetchPetPreferences() {
  return apiGet<PetPreferences>("/api/ai/preferences");
}

export async function updatePetPreferences(updates: Partial<PetPreferences>) {
  return apiPost<PetPreferences>("/api/ai/preferences", updates);
}
