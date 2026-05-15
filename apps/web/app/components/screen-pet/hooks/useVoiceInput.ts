import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

export function useVoiceInput(onResult: (text: string) => void, onError?: (error: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: "",
    isSupported: false,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setState((s) => ({ ...s, transcript: finalTranscript }));
        onResult(finalTranscript);
      } else if (interimTranscript) {
        setState((s) => ({ ...s, transcript: interimTranscript }));
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = `语音识别错误: ${event.error}`;
      setState((s) => ({ ...s, isRecording: false, error: msg }));
      onError?.(msg);
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, isRecording: false }));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onResult, onError]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    setState((s) => ({ ...s, isRecording: true, transcript: "", error: null }));
    recognitionRef.current.start();
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setState((s) => ({ ...s, isRecording: false }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
