import { useEffect, useRef } from "react";

const WAKE_WORD = "小狼";

export function useWakeWord(enabled: boolean, onWake: () => void) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartingRef = useRef(false);

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
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore no-speech and aborted errors, restart on others
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      if (!restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => {
          restartingRef.current = false;
          try {
            recognition.start();
          } catch {
            // Ignore if already started or stopped
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (enabled && !restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => {
          restartingRef.current = false;
          try {
            recognition.start();
          } catch {
            // Ignore if already started or stopped
          }
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch {
      // Ignore start errors
    }
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [enabled, onWake]);
}
