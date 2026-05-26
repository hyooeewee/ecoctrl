import {
  SSEClient as BaseSSEClient,
  type SSEMessage,
  type SSEClientOptions as BaseOptions,
} from "@ecoctrl/shared";
import { useAuthStore } from "~/store/auth";
import { API_PREFIX } from "~/lib/env";

export type { SSEMessage };

export interface SSEClientOptions extends Omit<BaseOptions, "getToken"> {}

export class SSEClient {
  private client: BaseSSEClient;

  constructor(url: string, options: SSEClientOptions) {
    this.client = new BaseSSEClient(url, {
      ...options,
      getToken: async () => {
        const { accessToken } = useAuthStore.getState();
        if (!accessToken) throw new Error("No auth");
        const res = await fetch(`${API_PREFIX}/events/token`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
        const data = (await res.json()) as { token: string };
        return data.token;
      },
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
