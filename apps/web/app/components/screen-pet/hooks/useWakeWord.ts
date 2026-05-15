import { useEffect, useRef } from "react";

const WAKE_WORD = "小狼";

export function useWakeWord(enabled: boolean, onWake: () => void) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!enabled) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (transcript.includes(WAKE_WORD)) {
          onWake();
          recognition.stop();
          setTimeout(() => recognition.start(), 500);
        }
      }
    };

    recognition.onerror = () => {
      setTimeout(() => recognition.start(), 1000);
    };

    recognition.onend = () => {
      if (enabled) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [enabled, onWake]);
}
