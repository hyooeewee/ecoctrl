import { getDb } from "@/config/database";
import type { SSEEvent } from "@/sse/types";

/**
 * Emit an SSE event through PostgreSQL NOTIFY.
 * Any connected SSE clients will receive this event.
 */
export async function emitSseEvent(event: SSEEvent): Promise<void> {
  const db = getDb();
  await db.execute(`SELECT pg_notify('sse_events', ${JSON.stringify(JSON.stringify(event))})`);
}

/**
 * Convenience: emit a typed event without manually constructing SSEEvent.
 */
export async function emitEvent<T>(type: string, payload: T, id?: string): Promise<void> {
  await emitSseEvent({
    id,
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}
