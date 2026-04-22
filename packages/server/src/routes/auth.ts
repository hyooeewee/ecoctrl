import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getUserByUsername, getUserById, updateUser } from "@/repositories/users";
import {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
  deleteRefreshTokenById,
} from "@/repositories/refreshTokens";

const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const loginBodySchema = z.object({
  username: z.string(),
  password: z.string(),
});

const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    role: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/login",
    {
      schema: {
        summary: "Login with username and password",
        body: loginBodySchema,
        response: {
          200: tokenResponseSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };
      const user = await getUserByUsername(username);
      if (!user || !user.password) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const accessToken = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
      });
      const refreshToken = crypto.randomBytes(32).toString("base64");
      const tokenHash = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await createRefreshToken(user.id, tokenHash, expiresAt);
      await updateUser(user.id, { status: "online" });

      return reply.send({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      });
    },
  );

  fastify.post(
    "/refresh",
    {
      schema: {
        summary: "Refresh access token",
        body: z.object({ refreshToken: z.string() }),
        response: {
          200: z.object({ accessToken: z.string(), refreshToken: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const tokenHash = hashRefreshToken(refreshToken);
      const stored = await findValidRefreshToken(tokenHash);
      if (!stored) {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }
      const user = await getUserById(stored.userId);
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      // Rotate: delete old refresh token
      await deleteRefreshTokenById(stored.id);

      const accessToken = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
      });
      const newRefreshToken = crypto.randomBytes(32).toString("base64");
      const newTokenHash = hashRefreshToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await createRefreshToken(stored.userId, newTokenHash, expiresAt);
      return reply.send({ accessToken, refreshToken: newRefreshToken });
    },
  );

  fastify.post(
    "/logout",
    {
      schema: {
        summary: "Logout and invalidate refresh token",
        body: z.object({ refreshToken: z.string() }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const tokenHash = hashRefreshToken(refreshToken);
      await deleteRefreshToken(tokenHash);
      return reply.send({ ok: true });
    },
  );

  fastify.get(
    "/me",
    {
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
      schema: {
        summary: "Get current user",
        response: {
          200: z.object({
            id: z.string(),
            username: z.string(),
            email: z.string(),
            role: z.string(),
            avatarUrl: z.string().nullable(),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as { userId: string };
      const user = await getUserById(payload.userId);
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }
      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      });
    },
  );
}
