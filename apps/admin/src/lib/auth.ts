const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const auth = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  removeAccessToken: () => localStorage.removeItem(ACCESS_TOKEN_KEY),

  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => localStorage.removeItem(REFRESH_TOKEN_KEY),

  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
