import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  findUserByIdentifier,
  getUserByUsername,
  getUserByEmail,
  getUserById,
  updateUser,
  addUser,
} from "@/repositories/users";
import {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
  deleteRefreshTokenById,
} from "@/repositories/refreshTokens";
import { sendMail } from "@/lib/mailer";

const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

// In-memory verification code store: email -> { code, expiresAt }
const codeStore = new Map<string, { code: string; expiresAt: number }>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const loginBodySchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerBodySchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
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
    "/register",
    {
      schema: {
        summary: "Register a new user",
        body: registerBodySchema,
        response: {
          201: tokenResponseSchema,
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { username, email, password } = request.body as {
        username: string;
        email: string;
        password: string;
      };

      const existingByUsername = await getUserByUsername(username);
      if (existingByUsername) {
        return reply.status(409).send({ error: "Username already taken" });
      }

      const existingByEmail = await getUserByEmail(email);
      if (existingByEmail) {
        return reply.status(409).send({ error: "Email already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: crypto.randomUUID(),
        username,
        email,
        role: "viewer" as const,
        status: "offline" as const,
        lastLogin: null,
        avatarUrl: null,
      };

      await addUser({ ...newUser, password: hashedPassword });

      const accessToken = fastify.jwt.sign({
        userId: newUser.id,
        username: newUser.username,
      });
      const refreshToken = crypto.randomBytes(32).toString("base64");
      const tokenHash = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await createRefreshToken(newUser.id, tokenHash, expiresAt);

      return reply.status(201).send({
        accessToken,
        refreshToken,
        user: { id: newUser.id, username, email, role: newUser.role, avatarUrl: null },
      });
    },
  );

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
      const user = await findUserByIdentifier(username);
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

  fastify.post(
    "/forgot-password/send-code",
    {
      schema: {
        summary: "Send verification code to email",
        body: z.object({ email: z.string().email() }),
        response: {
          200: z.object({ ok: z.literal(true) }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      const user = await getUserByEmail(email);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const code = generateCode();
      codeStore.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

      await sendMail({
        to: email,
        subject: "EcoCtrl 密码重置验证码",
        text: `您的验证码是：${code}，5分钟内有效。`,
        html: `\u003cp\u003e您的验证码是：\u003cstrong\u003e${code}\u003c/strong\u003e，5分钟内有效。\u003c/p\u003e`,
      });

      return reply.send({ ok: true });
    },
  );

  fastify.post(
    "/forgot-password/reset",
    {
      schema: {
        summary: "Reset password with verification code",
        body: z.object({
          email: z.string().email(),
          code: z.string().length(6),
          newPassword: z.string().min(6),
        }),
        response: {
          200: z.object({ ok: z.literal(true) }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, code, newPassword } = request.body as {
        email: string;
        code: string;
        newPassword: string;
      };

      const record = codeStore.get(email);
      if (!record || Date.now() > record.expiresAt) {
        return reply.status(400).send({ error: "验证码已过期" });
      }
      if (record.code !== code) {
        return reply.status(400).send({ error: "验证码错误" });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await updateUser(user.id, { password: hashed });
      codeStore.delete(email);

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
