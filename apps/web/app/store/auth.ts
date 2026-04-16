import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType?: "bearer" | "refresh" | null;
}

interface AuthStore extends AuthState {
  setTokens: (tokens: Partial<AuthState>) => void;
  clearTokens: () => void;
}

const defaults: AuthState = {
  accessToken: null,
  refreshToken: null,
  tokenType: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...defaults,
      setTokens: (tokens) => set((state) => ({ ...state, ...tokens })),
      clearTokens: () => set(defaults),
    }),
    {
      name: "ecoctrl-auth",
    },
  ),
);
