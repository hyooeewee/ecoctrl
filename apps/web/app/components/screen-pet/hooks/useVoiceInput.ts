import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

export function useVoiceInput(
  onResult?: (text: string) => void,
  onError?: (error: string) => void,
) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: "",
    isSupported: false,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const finalRef = useRef("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState((s) => ({ ...s, isSupported: false }));
      return;
    }

    setState((s) => ({ ...s, isSupported: true }));

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setState((s) => ({ ...s, transcript: finalRef.current + interimTranscript }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Aborted/no-speech are expected when the user releases the button quickly.
      if (event.error === "aborted" || event.error === "no-speech") {
        setState((s) => ({ ...s, isRecording: false }));
        return;
      }

      const msg = `语音识别错误: ${event.error}`;
      setState((s) => ({ ...s, isRecording: false, error: msg }));
      onError?.(msg);
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, isRecording: false }));

      if (activeRef.current) {
        activeRef.current = false;
        const text = finalRef.current.trim();
        if (text) {
          onResult?.(text);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      activeRef.current = false;
      recognition.stop();
    };
  }, [onResult, onError]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    activeRef.current = true;
    finalRef.current = "";
    setState((s) => ({ ...s, isRecording: true, transcript: "", error: null }));

    try {
      recognitionRef.current.start();
    } catch {
      activeRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore stop errors (e.g. already stopped).
    }
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
