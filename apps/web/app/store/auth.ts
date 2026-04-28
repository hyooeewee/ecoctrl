import { create } from "zustand";
import { persist } from "zustand/middleware";

import { authApi, type AuthUser } from "~/lib/auth-api";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthStore extends AuthState {
  isLoggedIn: () => boolean;
  setTokens: (tokens: Partial<AuthState>) => void;
  clearTokens: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const defaults: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...defaults,

      isLoggedIn: () => {
        const state = get();
        return !!state.accessToken && !!state.user;
      },

      setTokens: (tokens: Partial<AuthState>) => {
        set((state) => ({ ...state, ...tokens }));
      },

      clearTokens: () => {
        set(defaults);
      },

      login: async (email: string, password: string) => {
        const res = await authApi.login(email, password);
        set({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
        });
        // Notify settings store to rehydrate from the new user's localStorage key.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ecoctrl:rehydrate-settings"));
        }
      },

      logout: async () => {
        const { refreshToken, accessToken } = get();
        if (refreshToken && accessToken) {
          try {
            await authApi.logout(refreshToken, accessToken);
          } catch {
            // Ignore logout errors; still clear local state
          }
        }
        set(defaults);
        // Notify settings store to rehydrate from the guest localStorage key.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ecoctrl:rehydrate-settings"));
        }
      },

      fetchUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const user = await authApi.me(accessToken);
          set({ user });
        } catch {
          // If fetching user fails, clear auth state
          set(defaults);
        }
      },
    }),
    {
      name: "ecoctrl-auth",
    },
  ),
);
