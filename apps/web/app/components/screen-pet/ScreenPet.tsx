import { useCallback } from "react";
import { useLocation } from "react-router";
import { usePetStore } from "~/store/pet";
import { chatStream } from "~/lib/ai-api";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { useVoiceOutput } from "./hooks/useVoiceOutput";
import { usePetPosition } from "./hooks/usePetPosition";
import { useWakeWord } from "./hooks/useWakeWord";
import { PetAvatar } from "./PetAvatar";
import { ChatBubble } from "./ChatBubble";

export function ScreenPet() {
  const location = useLocation();
  const theme = usePetStore((s) => s.theme);
  const isOpen = usePetStore((s) => s.isOpen);
  const voiceEnabled = usePetStore((s) => s.voiceEnabled);
  const voiceSpeed = usePetStore((s) => s.voiceSpeed);
  const wakeWordEnabled = usePetStore((s) => s.wakeWordEnabled);
  const addMessage = usePetStore((s) => s.addMessage);
  const setLoading = usePetStore((s) => s.setLoading);
  const toggleOpen = usePetStore((s) => s.toggleOpen);
  const sessionId = usePetStore((s) => s.sessionId);
  const initSession = usePetStore((s) => s.initSession);

  const { position, isDragging, handlePointerDown, handlePointerMove, handlePointerUp } =
    usePetPosition();

  const { speak, isSpeaking, stop: stopSpeaking } = useVoiceOutput();

  useWakeWord(wakeWordEnabled && !isOpen, () => {
    toggleOpen();
  });

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      let sid = sessionId;
      if (!sid) {
        initSession();
        sid = usePetStore.getState().sessionId;
      }

      addMessage({ id: `${Date.now()}-user`, role: "user", content: text });
      setLoading(true);

      let assistantText = "";

      const cleanup = chatStream(
        {
          message: text,
          sessionId: sid ?? undefined,
          context: { currentPage: location.pathname },
        },
        (chunk) => {
          if (chunk.type === "text" && chunk.content) {
            assistantText += chunk.content;
            const state = usePetStore.getState();
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg?.role === "assistant" && lastMsg.id.startsWith("streaming")) {
              const updated = state.messages.map((m, i) =>
                i === state.messages.length - 1 ? { ...m, content: assistantText } : m,
              );
              state.setMessages(updated);
            } else {
              state.addMessage({
                id: `streaming-${Date.now()}`,
                role: "assistant",
                content: assistantText,
              });
            }
          }
          if (chunk.type === "tool_call" && chunk.toolCall) {
            const state = usePetStore.getState();
            state.addMessage({
              id: `${Date.now()}-tool`,
              role: "tool",
              content: `正在执行: ${chunk.toolCall.name}...`,
              toolCall: chunk.toolCall,
            });
          }
          if (chunk.type === "tool_result" && chunk.toolResult) {
            const state = usePetStore.getState();
            state.addMessage({
              id: `${Date.now()}-tool-result`,
              role: "tool",
              content: JSON.stringify(chunk.toolResult.result),
              toolResult: chunk.toolResult,
            });
          }
          if (chunk.type === "done") {
            setLoading(false);
            const state = usePetStore.getState();
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg?.role === "assistant" && lastMsg.id.startsWith("streaming")) {
              const updated = state.messages.map((m, i) =>
                i === state.messages.length - 1 ? { ...m, id: `${Date.now()}-assistant` } : m,
              );
              state.setMessages(updated);
            }
            if (voiceEnabled && assistantText) {
              speak(assistantText, voiceSpeed);
            }
          }
          if (chunk.type === "error") {
            setLoading(false);
            addMessage({
              id: `${Date.now()}-error`,
              role: "assistant",
              content: chunk.content ?? "抱歉，服务暂时不可用",
            });
          }
        },
        (error) => {
          setLoading(false);
          addMessage({
            id: `${Date.now()}-error`,
            role: "assistant",
            content: `错误: ${error}`,
          });
        },
      );

      return cleanup;
    },
    [
      sessionId,
      location.pathname,
      voiceEnabled,
      voiceSpeed,
      addMessage,
      setLoading,
      initSession,
      speak,
    ],
  );

  const { isRecording, startRecording, stopRecording } = useVoiceInput(
    useCallback(
      (text: string) => {
        if (text.trim()) handleSend(text);
      },
      [handleSend],
    ),
  );

  return (
    <div
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <ChatBubble onSend={handleSend} />

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => {
          if (!isDragging) toggleOpen();
        }}
        className="touch-none"
      >
        <PetAvatar
          theme={theme}
          isSpeaking={isSpeaking}
          isListening={isRecording}
          isLoading={usePetStore.getState().isLoading}
        />
      </div>
    </div>
  );
}
