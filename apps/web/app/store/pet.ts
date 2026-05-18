import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PetTheme = string;

const defaultPetId = "usagi";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  toolResult?: {
    name: string;
    result: unknown;
  };
}

interface PetState {
  isOpen: boolean;
  isDragging: boolean;
  position: { x: number; y: number };
  theme: PetTheme;
  voiceEnabled: boolean;
  voiceSpeed: number;
  wakeWordEnabled: boolean;
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setDragging: (dragging: boolean) => void;
  setTheme: (theme: PetTheme) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceSpeed: (speed: number) => void;
  setWakeWordEnabled: (enabled: boolean) => void;
  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  initSession: () => void;
}

const defaults = {
  isOpen: false,
  isDragging: false,
  position: {
    x: typeof window !== "undefined" ? window.innerWidth - 100 : 400,
    y: typeof window !== "undefined" ? window.innerHeight - 150 : 500,
  },
  theme: defaultPetId as PetTheme,
  voiceEnabled: true,
  voiceSpeed: 1.0,
  wakeWordEnabled: true,
  messages: [],
  isLoading: false,
  sessionId: null,
};

export const usePetStore = create<PetState>()(
  persist(
    (set, _get) => ({
      ...defaults,

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
      setPosition: (pos) => set({ position: pos }),
      setDragging: (dragging) => set({ isDragging: dragging }),
      setTheme: (theme) => set({ theme }),
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setVoiceSpeed: (speed) => set({ voiceSpeed: speed }),
      setWakeWordEnabled: (enabled) => set({ wakeWordEnabled: enabled }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      setMessages: (msgs) => set({ messages: msgs }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearMessages: () => set({ messages: [], sessionId: null }),
      initSession: () => set({ sessionId: crypto.randomUUID() }),
    }),
    {
      name: "ecoctrl-pet",
      partialize: (state) => ({
        theme: state.theme,
        voiceEnabled: state.voiceEnabled,
        voiceSpeed: state.voiceSpeed,
        wakeWordEnabled: state.wakeWordEnabled,
        position: state.position,
      }),
    },
  ),
);
