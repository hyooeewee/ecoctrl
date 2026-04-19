import type { FastifyInstance } from "fastify";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import { eq } from "drizzle-orm";

const meSchema = {
  type: "object",
  properties: {
    username: { type: "string" },
    avatarUrl: { type: "string" },
  },
};

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/me",
    {
      schema: {
        summary: "Get current user",
        response: {
          200: meSchema,
        },
      },
    },
    async (_request, reply) => {
      // Return the first active user as the current user
      const rows = await db.select().from(users).where(eq(users.status, "active")).limit(1);
      if (rows.length === 0) {
        return reply.send({ username: "Admin", avatarUrl: "https://avatar.vercel.sh/admin?size=32" });
      }
      const user = rows[0];
      return reply.send({
        username: user.name,
        avatarUrl: user.avatarUrl ?? "https://avatar.vercel.sh/admin?size=32",
      });
    },
  );
}
