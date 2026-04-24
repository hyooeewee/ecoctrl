interface TokenRefreshOptions {
  getToken: () => Promise<string | null>;
  refresh: () => Promise<string>;
  isExpired?: (token: string) => boolean;
  bufferMs?: number;
}

export function withTokenRefresh(opts: TokenRefreshOptions) {
  const { getToken, refresh, isExpired, bufferMs = 60000 } = opts;

  async function ensure(): Promise<string> {
    const token = await getToken();
    if (!token || (isExpired ? isExpired(token) : false)) {
      return refresh();
    }
    return token;
  }

  return { ensure };
}
