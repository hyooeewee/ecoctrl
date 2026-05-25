import type postgres from "postgres";
import type { SSEEvent } from "@/sse/types";

export type NotifyCallback = (event: SSEEvent) => void;

export interface PgNotifyListener {
  start(channel: string, callback: NotifyCallback): Promise<void>;
  stop(): Promise<void>;
}

export function createPgNotifyListener(sql: postgres.Sql<Record<string, never>>): PgNotifyListener {
  let activeCallback: NotifyCallback | null = null;
  let unsubscribeFn: (() => Promise<void>) | null = null;

  return {
    async start(channel: string, callback: NotifyCallback) {
      activeCallback = callback;
      unsubscribeFn = await sql.listen(channel, (payload) => {
        try {
          const parsed = JSON.parse(payload) as SSEEvent;
          if (activeCallback) activeCallback(parsed);
        } catch {
          // Silently drop malformed payloads
        }
      });
    },
    async stop() {
      activeCallback = null;
      if (unsubscribeFn) {
        await unsubscribeFn();
        unsubscribeFn = null;
      }
      await sql.end();
    },
  };
}
