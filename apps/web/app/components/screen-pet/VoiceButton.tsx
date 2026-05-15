import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  isRecording: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceButton({ isRecording, isSupported, onStart, onStop }: VoiceButtonProps) {
  if (!isSupported) return null;

  return (
    <button
      onClick={isRecording ? onStop : onStart}
      className={`flex items-center justify-center rounded-full p-2 transition-all ${
        isRecording
          ? "animate-pulse bg-red-500 text-white"
          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
      }`}
      title={isRecording ? "停止录音" : "语音输入"}
    >
      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
}
