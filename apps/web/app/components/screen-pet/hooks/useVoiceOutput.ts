import { useState, useCallback, useRef } from "react";

interface VoiceOutputState {
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useVoiceOutput() {
  const [state, setState] = useState<VoiceOutputState>({
    isSpeaking: false,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, speed = 1.0) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = speed;

    utterance.onstart = () => setState((s) => ({ ...s, isSpeaking: true }));
    utterance.onend = () => setState((s) => ({ ...s, isSpeaking: false }));
    utterance.onerror = () => setState((s) => ({ ...s, isSpeaking: false }));

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setState((s) => ({ ...s, isSpeaking: false }));
    }
  }, []);

  return {
    ...state,
    speak,
    stop,
  };
}
