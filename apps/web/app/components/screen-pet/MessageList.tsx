import { useRef, useEffect } from "react";
import { usePetStore } from "~/store/pet";
import { MessageItem } from "./MessageItem";

export function MessageList() {
  const messages = usePetStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-xs text-slate-500">
          你好！我是小狼，有什么可以帮你的吗？
        </div>
      )}
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
