import { useState } from "react";
import { Mic, Send } from "lucide-react";
import { useLocale } from "~/locales";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isRecording?: boolean;
  isSupported?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export function ChatInput({
  onSend,
  isLoading,
  isRecording = false,
  isSupported = false,
  onStartRecording,
  onStopRecording,
}: ChatInputProps) {
  const t = useLocale();
  const [text, setText] = useState("");
  const isBusy = isLoading || isRecording;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isBusy) return;
    onSend(text.trim());
    setText("");
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isSupported || isLoading) return;
    onStartRecording?.();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onStopRecording?.();
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
        placeholder={t.pet.inputPlaceholder}
        disabled={isBusy}
        className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
      />

      {isSupported && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          disabled={isLoading}
          title={isRecording ? t.pet.voiceInputActive : t.pet.voiceInput}
          className={[
            "flex touch-none items-center justify-center rounded-lg p-2 transition-colors",
            isRecording
              ? "bg-red-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600",
            isLoading ? "opacity-40" : "",
          ].join(" ")}
        >
          <Mic size={16} className={isRecording ? "animate-pulse" : ""} />
        </button>
      )}

      <button
        type="submit"
        disabled={isBusy || !text.trim()}
        className="flex items-center justify-center rounded-lg bg-cyan-600 p-2 text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
      >
        <Send size={16} />
      </button>
    </form>
  );
}
