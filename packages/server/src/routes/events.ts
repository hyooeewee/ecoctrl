import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sseManager } from "@/sse/manager";
import type { SSEEvent } from "@/sse/types";
import { getLogger } from "@/lib/logger";

const logger = getLogger("sse");

const SSE_TOKEN_EXPIRY_SECONDS = 30;
const HEARTBEAT_INTERVAL_MS = 30000;

export default async function eventsRoutes(fastify: FastifyInstance) {
  // ─── Token issuance ────────────────────────────────────────────────────────

  fastify.post(
    "/token",
    {
      schema: {
        tags: ["Events"],
        summary: "Get a short-lived token for SSE connection",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user as { userId: string } | undefined;
      if (!user?.userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const token = fastify.jwt.sign(
        { userId: user.userId, purpose: "sse" },
        { expiresIn: `${SSE_TOKEN_EXPIRY_SECONDS}s` },
      );

      return reply.send({ token, expiresIn: SSE_TOKEN_EXPIRY_SECONDS });
    },
  );

  // ─── SSE stream ────────────────────────────────────────────────────────────

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Events"],
        summary: "SSE event stream",
        security: [],
        // Query param documented but not validated by Zod here (handled manually)
      },
    },
    async (request, reply) => {
      const { token } = request.query as { token?: string };

      if (!token) {
        return reply.status(401).send({ error: "Missing token" });
      }

      let userId: string | null = null;
      try {
        const decoded = fastify.jwt.verify(token) as { purpose: string; userId: string };
        if (decoded.purpose !== "sse") {
          throw new Error("Invalid token purpose");
        }
        userId = decoded.userId;
      } catch {
        return reply.status(401).send({ error: "Invalid or expired token" });
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      });

      const conn = sseManager.add(userId, reply);
      logger.info(`SSE connection ${conn.id} opened for user ${userId}`);

      // Send initial connected event
      sseManager.sendToConnection(conn.id, {
        type: "ping",
        payload: { message: "connected" },
        timestamp: new Date().toISOString(),
      });

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          reply.raw.write(":ping\n\n");
        } catch {
          clearInterval(heartbeat);
          sseManager.remove(conn.id);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup on disconnect
      request.raw.on("close", () => {
        clearInterval(heartbeat);
        sseManager.remove(conn.id);
        logger.info(`SSE connection ${conn.id} closed`);
      });

      // Keep the handler alive
      await new Promise(() => {
        // Intentionally never resolves; connection stays open
      });
    },
  );
}
