import { randomUUID } from "node:crypto";
import type { SSEEvent, SSEConnection } from "./types";

export class SSEManager {
  private connections = new Map<string, SSEConnection>();

  add(userId: string | null, reply: SSEConnection["reply"]): SSEConnection {
    const conn: SSEConnection = {
      id: randomUUID(),
      userId,
      reply,
      connectedAt: Date.now(),
    };
    this.connections.set(conn.id, conn);
    return conn;
  }

  remove(id: string): void {
    this.connections.delete(id);
  }

  count(): number {
    return this.connections.size;
  }

  broadcast(event: SSEEvent): void {
    const payload = this.serialize(event);
    for (const conn of this.connections.values()) {
      this.write(conn, payload);
    }
  }

  sendToUser(userId: string, event: SSEEvent): void {
    const payload = this.serialize(event);
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) {
        this.write(conn, payload);
      }
    }
  }

  sendToConnection(connectionId: string, event: SSEEvent): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    this.write(conn, this.serialize(event));
    return true;
  }

  private serialize(event: SSEEvent): string {
    const lines: string[] = [];
    if (event.id) lines.push(`id: ${event.id}`);
    lines.push(`event: ${event.type}`);
    lines.push(`data: ${JSON.stringify({ ...event.payload, _timestamp: event.timestamp })}`);
    lines.push("");
    return lines.join("\n") + "\n";
  }

  private write(conn: SSEConnection, payload: string): void {
    try {
      conn.reply.raw.write(payload);
    } catch {
      // Connection dead, clean up lazily
      this.connections.delete(conn.id);
    }
  }
}

export const sseManager = new SSEManager();
