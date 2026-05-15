import { X } from "lucide-react";
import { usePetStore } from "~/store/pet";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatBubbleProps {
  onSend: (text: string) => void;
}

export function ChatBubble({ onSend }: ChatBubbleProps) {
  const isOpen = usePetStore((s) => s.isOpen);
  const isLoading = usePetStore((s) => s.isLoading);
  const toggleOpen = usePetStore((s) => s.toggleOpen);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-20 right-0 flex h-[400px] w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0f172a]/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-medium text-slate-200">蓝宝</span>
        </div>
        <button
          onClick={toggleOpen}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
        >
          <X size={16} />
        </button>
      </div>

      <MessageList />

      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
