import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  findUserByIdentifier,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  updateUser,
  createUser,
} from "@/repositories/users";
import {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
  deleteRefreshTokenById,
  deleteRefreshTokensByUserId,
} from "@/repositories/refreshTokens";
import { sendMail } from "@/lib/mailer";

const hashRefreshToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// In-memory verification code store: email -> { code, expiresAt, purpose }
const codeStore = new Map<
  string,
  { code: string; expiresAt: number; purpose: "register" | "reset" }
>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const loginBodySchema = z
  .object({
    username: z.string(),
    password: z.string(),
  })
  .meta({
    example: { username: "ecoctrl@example.com", password: "P@ssword4ecoctrl" },
  });

const registerBodySchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  code: z.string().length(6),
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
    "/register/send-code",
    {
      schema: {
        tags: ["Auth"],
        summary: "Send verification code for registration",
        security: [],
        body: z.object({ email: z.string().email() }),
        response: {
          200: z.object({ ok: z.literal(true) }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      const existing = await findUserByEmail(email);
      if (existing) {
        return reply.status(409).send({ error: "Email already registered" });
      }

      const code = generateCode();
      codeStore.set(email, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        purpose: "register",
      });

      await sendMail({
        to: email,
        subject: "EcoCtrl 注册验证码",
        text: `您的验证码是：${code}，5分钟内有效。`,
        html: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.08);padding:32px;">
        <tr>
          <td align="center" style="font-size:20px;font-weight:600;color:#333;padding-bottom:16px;">
            注册验证码
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size:14px;color:#666;padding-bottom:24px;">
            您正在注册 EcoCtrl 账号，请使用以下验证码：
          </td>
        </tr>
        <tr>
          <td align="center">
            <div style="display:inline-block;font-size:32px;letter-spacing:6px;font-weight:700;color:#4f46e5;background:linear-gradient(135deg,#eef2ff,#f5f7ff);padding:16px 32px;border-radius:10px;border:1px solid #e0e7ff;">
              ${code}
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size:13px;color:#999;padding-top:24px;">
            验证码 5 分钟内有效，请勿泄露给他人
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;">
            <hr style="border:none;border-top:1px solid #eee;">
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size:12px;color:#bbb;padding-top:12px;">
            如果这不是您的操作，请忽略此邮件
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
      });

      return reply.send({ ok: true });
    },
  );

  fastify.post(
    "/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Register a new user",
        security: [],
        body: registerBodySchema,
        response: {
          201: tokenResponseSchema,
          400: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { username, email, password, code } = request.body as {
        username: string;
        email: string;
        password: string;
        code: string;
      };

      const existingByUsername = await findUserByUsername(username);
      if (existingByUsername) {
        return reply.status(409).send({ error: "Username already taken" });
      }

      const existingByEmail = await findUserByEmail(email);
      if (existingByEmail) {
        return reply.status(409).send({ error: "Email already taken" });
      }

      const record = codeStore.get(email);
      if (!record || record.purpose !== "register" || Date.now() > record.expiresAt) {
        return reply.status(400).send({ error: "验证码已过期，请重新获取" });
      }
      if (record.code !== code) {
        return reply.status(400).send({ error: "验证码错误" });
      }
      codeStore.delete(email);

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await createUser({
        id: crypto.randomUUID(),
        username,
        email,
        role: "viewer",
        status: "offline",
        lastLogin: null,
        avatarUrl: null,
        password: hashedPassword,
      });

      const accessToken = fastify.jwt.sign({
        userId: newUser.id,
        username: newUser.username,
      });
      const refreshToken = crypto.randomBytes(32).toString("base64");
      const tokenHash = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await deleteRefreshTokensByUserId(newUser.id);
      await createRefreshToken(newUser.id, tokenHash, expiresAt);

      return reply.status(201).send({
        accessToken,
        refreshToken,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          avatarUrl: newUser.avatarUrl,
        },
      });
    },
  );

  fastify.post(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Login with username and password",
        security: [],
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

      await deleteRefreshTokensByUserId(user.id);
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
        tags: ["Auth"],
        summary: "Refresh access token",
        security: [],
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
      const user = await findUserById(stored.userId);
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
        tags: ["Auth"],
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
        tags: ["Auth"],
        summary: "Send verification code to email",
        security: [],
        body: z.object({ email: z.string().email() }),
        response: {
          200: z.object({ ok: z.literal(true) }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      const user = await findUserByEmail(email);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const code = generateCode();
      codeStore.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000, purpose: "reset" });

      await sendMail({
        to: email,
        subject: "EcoCtrl 密码重置验证码",
        text: `您的验证码是：${code}，5分钟内有效。`,
        html: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      
      <!-- 卡片 -->
      <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.08);padding:32px;">
        
        <!-- 标题 -->
        <tr>
          <td align="center" style="font-size:20px;font-weight:600;color:#333;padding-bottom:16px;">
            验证码确认
          </td>
        </tr>

        <!-- 提示 -->
        <tr>
          <td align="center" style="font-size:14px;color:#666;padding-bottom:24px;">
            您正在进行身份验证，请使用以下验证码：
          </td>
        </tr>

        <!-- 验证码 -->
        <tr>
          <td align="center">
            <div style="
              display:inline-block;
              font-size:32px;
              letter-spacing:6px;
              font-weight:700;
              color:#4f46e5;
              background:linear-gradient(135deg,#eef2ff,#f5f7ff);
              padding:16px 32px;
              border-radius:10px;
              border:1px solid #e0e7ff;
            ">
              ${code}
            </div>
          </td>
        </tr>

        <!-- 有效期 -->
        <tr>
          <td align="center" style="font-size:13px;color:#999;padding-top:24px;">
            验证码 5 分钟内有效，请勿泄露给他人
          </td>
        </tr>

        <!-- 分割线 -->
        <tr>
          <td style="padding-top:24px;">
            <hr style="border:none;border-top:1px solid #eee;">
          </td>
        </tr>

        <!-- 底部 -->
        <tr>
          <td align="center" style="font-size:12px;color:#bbb;padding-top:12px;">
            如果这不是您的操作，请忽略此邮件
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`,
      });

      return reply.send({ ok: true });
    },
  );

  fastify.post(
    "/forgot-password/reset",
    {
      schema: {
        tags: ["Auth"],
        summary: "Reset password with verification code",
        security: [],
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
      if (!record || record.purpose !== "reset" || Date.now() > record.expiresAt) {
        return reply.status(400).send({ error: "验证码已过期" });
      }
      if (record.code !== code) {
        return reply.status(400).send({ error: "验证码错误" });
      }

      const user = await findUserByEmail(email);
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
        tags: ["Auth"],
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
      const user = await findUserById(payload.userId);
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
