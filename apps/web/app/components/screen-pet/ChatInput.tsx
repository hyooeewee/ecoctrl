import { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-slate-700/50 p-2"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入消息..."
        disabled={isLoading}
        className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-500"
      />
      <button
        type="submit"
        disabled={isLoading || !text.trim()}
        className="flex items-center justify-center rounded-lg bg-cyan-600 p-2 text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
      >
        <Send size={16} />
      </button>
    </form>
  );
}
