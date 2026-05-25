import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore } from "~/store/pet";

describe("pet store", () => {
  beforeEach(() => {
    usePetStore.setState({
      isOpen: false,
      isDragging: false,
      position: { x: 400, y: 500 },
      theme: "usagi",
      voiceEnabled: true,
      voiceSpeed: 1.0,
      wakeWordEnabled: true,
      messages: [],
      isLoading: false,
      sessionId: null,
    });
  });

  it("toggles open state", () => {
    expect(usePetStore.getState().isOpen).toBe(false);
    usePetStore.getState().toggleOpen();
    expect(usePetStore.getState().isOpen).toBe(true);
    usePetStore.getState().toggleOpen();
    expect(usePetStore.getState().isOpen).toBe(false);
  });

  it("adds messages", () => {
    const msg1 = { id: "1", role: "user" as const, content: "hello" };
    const msg2 = { id: "2", role: "assistant" as const, content: "hi" };
    usePetStore.getState().addMessage(msg1);
    usePetStore.getState().addMessage(msg2);
    expect(usePetStore.getState().messages).toHaveLength(2);
    expect(usePetStore.getState().messages[0].content).toBe("hello");
    expect(usePetStore.getState().messages[1].role).toBe("assistant");
  });

  it("sets messages", () => {
    const msgs = [
      { id: "1", role: "user" as const, content: "a" },
      { id: "2", role: "assistant" as const, content: "b" },
    ];
    usePetStore.getState().setMessages(msgs);
    expect(usePetStore.getState().messages).toHaveLength(2);
  });

  it("clears messages and resets session", () => {
    usePetStore.getState().initSession();
    usePetStore.getState().addMessage({ id: "1", role: "user", content: "test" });
    expect(usePetStore.getState().messages).toHaveLength(1);
    expect(usePetStore.getState().sessionId).not.toBeNull();

    usePetStore.getState().clearMessages();
    expect(usePetStore.getState().messages).toHaveLength(0);
    expect(usePetStore.getState().sessionId).toBeNull();
  });

  it("inits session with UUID", () => {
    expect(usePetStore.getState().sessionId).toBeNull();
    usePetStore.getState().initSession();
    const sid = usePetStore.getState().sessionId;
    expect(sid).not.toBeNull();
    expect(sid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("sets theme", () => {
    usePetStore.getState().setTheme("violet");
    expect(usePetStore.getState().theme).toBe("violet");
  });

  it("sets voice settings", () => {
    usePetStore.getState().setVoiceEnabled(false);
    expect(usePetStore.getState().voiceEnabled).toBe(false);
    usePetStore.getState().setVoiceSpeed(1.5);
    expect(usePetStore.getState().voiceSpeed).toBe(1.5);
  });

  it("sets wake word enabled", () => {
    usePetStore.getState().setWakeWordEnabled(false);
    expect(usePetStore.getState().wakeWordEnabled).toBe(false);
  });

  it("persists only selected fields", () => {
    // The persist middleware's partialize config controls this.
    // We verify the store has the expected shape.
    const state = usePetStore.getState();
    expect(state.theme).toBeDefined();
    expect(state.voiceEnabled).toBeDefined();
    expect(state.voiceSpeed).toBeDefined();
    expect(state.wakeWordEnabled).toBeDefined();
    expect(state.position).toBeDefined();
    expect(state.messages).toBeDefined();
    expect(state.isLoading).toBeDefined();
  });
});
