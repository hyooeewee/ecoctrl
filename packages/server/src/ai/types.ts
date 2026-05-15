export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  result: unknown;
}

export interface Tool {
  name: string;
  description: string;
  parameters: object;
  handler: (args: unknown, ctx: ToolContext) => Promise<unknown>;
  minRole: "guest" | "user" | "admin" | "superadmin";
}

export interface ToolContext {
  userId: number;
  role: string;
  currentPage?: string;
}

export interface AIClient {
  chat(
    messages: ChatMessage[],
    tools: Tool[],
    onChunk: (chunk: AIStreamChunk) => void,
  ): Promise<void>;
}

export interface AIStreamChunk {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}
