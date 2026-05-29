import {
  SSEClient as BaseSSEClient,
  type SSEMessage,
  type SSEClientOptions as BaseOptions,
} from "@ecoctrl/shared";
import { apiPost } from "~/lib/api";
import { useAuthStore } from "~/store/auth";
import { API_PREFIX } from "~/lib/env";

export type { SSEMessage };

export interface SSEClientOptions extends Omit<BaseOptions, "getToken"> {
  onTokenError?: (error: unknown) => boolean;
}

export class SSEClient {
  private client: BaseSSEClient;

  constructor(url: string, options: SSEClientOptions) {
    const { onTokenError, ...rest } = options;
    this.client = new BaseSSEClient(url, {
      ...rest,
      getToken: async () => {
        const { accessToken } = useAuthStore.getState();
        if (!accessToken) throw new Error("No auth");
        const res = await apiPost<{ token: string }>(
          `${API_PREFIX}/events/token`,
          undefined,
          undefined,
          true, // noReload: don't clear auth state on failure
        );
        if (!res.ok || !res.data) {
          throw new Error(res.error || "Token request failed");
        }
        return res.data.token;
      },
      onTokenError,
    });
  }

  async connect(): Promise<void> {
    return this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  dispose(): void {
    this.client.dispose();
  }
}
