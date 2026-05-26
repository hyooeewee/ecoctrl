import {
  SSEClient as BaseSSEClient,
  type SSEMessage,
  type SSEClientOptions as BaseOptions,
} from "@ecoctrl/shared";
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
        const res = await fetch(`${API_PREFIX}/events/token`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
        const data = (await res.json()) as { token: string };
        return data.token;
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
