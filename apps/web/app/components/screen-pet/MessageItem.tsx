import type { Message } from "~/store/pet";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-cyan-600 text-white"
            : isTool
              ? "bg-amber-900/40 text-amber-200 border border-amber-700/30"
              : "bg-slate-800 text-slate-200"
        }`}
      >
        {isTool && message.toolResult && (
          <div className="mb-1 text-xs font-medium text-amber-400">
            执行: {message.toolResult.name}
          </div>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}
