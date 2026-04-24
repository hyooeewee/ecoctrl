import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import {
  findOAuthAccount,
  createOAuthAccount,
  unlinkOAuthAccount,
  getUserOAuthAccounts,
} from "@/repositories/oauthAccounts";
import {
  findUserByIdentifier,
  getUserByEmail,
  getUserById,
  addUser,
  updateUser,
} from "@/repositories/users";
import {
  createRefreshToken,
  deleteRefreshToken,
} from "@/repositories/refreshTokens";
import bcrypt from "bcryptjs";

const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

// In-memory state store for OAuth CSRF protection: state -> { provider, redirectUri, expiresAt }
const stateStore = new Map<
  string,
  { provider: string; redirectUri: string; expiresAt: number }
>();

// In-memory temp bind token store: token -> { provider, providerUserId, providerEmail, nickname, avatarUrl, expiresAt }
const tempBindStore = new Map<
  string,
  {
    provider: string;
    providerUserId: string;
    providerEmail: string | null;
    nickname: string | null;
    avatarUrl: string | null;
    expiresAt: number;
  }
>();

function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateTempToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [k, v] of stateStore) {
    if (now > v.expiresAt) stateStore.delete(k);
  }
  for (const [k, v] of tempBindStore) {
    if (now > v.expiresAt) tempBindStore.delete(k);
  }
}

// ─── WeChat ───────────────────────────────────────────────

function getWechatAuthorizeUrl(state: string, redirectUri: string) {
  const appId = process.env.WECHAT_APP_ID!;
  const encodedRedirect = encodeURIComponent(redirectUri);
  return `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodedRedirect}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
}

async function wechatExchangeToken(code: string) {
  const appId = process.env.WECHAT_APP_ID!;
  const secret = process.env.WECHAT_APP_SECRET!;
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token?: string;
    openid?: string;
    unionid?: string;
    expires_in?: number;
    refresh_token?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (data.errcode) {
    throw new Error(`WeChat OAuth error: ${data.errmsg}`);
  }
  return {
    accessToken: data.access_token!,
    openid: data.openid!,
    unionid: data.unionid,
    expiresIn: data.expires_in ?? 7200,
    refreshToken: data.refresh_token,
  };
}

async function wechatGetUserInfo(accessToken: string, openid: string) {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    unionid?: string;
    nickname?: string;
    headimgurl?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (data.errcode) {
    throw new Error(`WeChat userinfo error: ${data.errmsg}`);
  }
  return {
    providerUserId: data.unionid || openid,
    nickname: data.nickname ?? null,
    avatarUrl: data.headimgurl ?? null,
    email: null as string | null,
  };
}

// ─── Feishu ───────────────────────────────────────────────

function getFeishuAuthorizeUrl(state: string, redirectUri: string) {
  const appId = process.env.FEISHU_APP_ID!;
  const encodedRedirect = encodeURIComponent(redirectUri);
  return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${encodedRedirect}&state=${state}`;
}

async function feishuExchangeToken(code: string) {
  const appId = process.env.FEISHU_APP_ID!;
  const secret = process.env.FEISHU_APP_SECRET!;
  const res = await fetch(
    "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: appId,
        client_secret: secret,
        code,
      }),
    },
  );
  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };
  if (json.code !== 0 || !json.data) {
    throw new Error(`Feishu OAuth error: ${json.msg}`);
  }
  return {
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    expiresIn: json.data.expires_in,
  };
}

async function feishuGetUserInfo(accessToken: string) {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/authen/v2/user_info",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: {
      union_id?: string;
      open_id?: string;
      email?: string;
      name?: string;
      avatar_url?: string;
    };
  };
  if (json.code !== 0 || !json.data) {
    throw new Error(`Feishu userinfo error: ${json.msg}`);
  }
  return {
    providerUserId: json.data.union_id || json.data.open_id!,
    nickname: json.data.name ?? null,
    avatarUrl: json.data.avatar_url ?? null,
    email: json.data.email ?? null,
  };
}

// ─── Common helpers ───────────────────────────────────────

async function issueTokens(
  fastify: FastifyInstance,
  userId: string,
  username: string,
) {
  const accessToken = fastify.jwt.sign({ userId, username });
  const refreshToken = crypto.randomBytes(32).toString("base64");
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await createRefreshToken(userId, tokenHash, expiresAt);
  await updateUser(userId, { status: "online" });
  return { accessToken, refreshToken };
}

function getFrontendRedirectUrl(
  baseRedirect: string,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(path, baseRedirect);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export default async function oauthRoutes(fastify: FastifyInstance) {
  // ─── GET /providers ─────────────────────────────────────
  fastify.get(
    "/providers",
    {
      schema: {
        summary: "Get available OAuth providers",
        security: [],
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              icon: z.string(),
            }),
          ),
        },
      },
    },
    async (_request, reply) => {
      const providers = [] as { id: string; name: string; icon: string }[];
      if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
        providers.push({ id: "wechat", name: "微信", icon: "wechat" });
      }
      if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
        providers.push({ id: "feishu", name: "飞书", icon: "feishu" });
      }
      return reply.send(providers);
    },
  );

  // ─── GET /:provider/authorize ───────────────────────────
  fastify.get(
    "/:provider/authorize",
    {
      schema: {
        summary: "Start OAuth authorization",
        security: [],
        params: z.object({ provider: z.enum(["wechat", "feishu"]) }),
        querystring: z.object({ redirectUri: z.string() }),
      },
    },
    async (request, reply) => {
      cleanExpiredEntries();
      const { provider } = request.params as { provider: string };
      const { redirectUri } = request.query as { redirectUri: string };

      const state = generateState();
      stateStore.set(state, {
        provider,
        redirectUri,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const callbackUrl = `${process.env.BASE_URL || `${request.protocol}://${request.hostname}`}/api/oauth/${provider}/callback`;

      if (provider === "wechat") {
        return reply.redirect(getWechatAuthorizeUrl(state, callbackUrl));
      }
      if (provider === "feishu") {
        return reply.redirect(getFeishuAuthorizeUrl(state, callbackUrl));
      }
      return reply.status(400).send({ error: "Unsupported provider" });
    },
  );

  // ─── GET /:provider/callback ────────────────────────────
  fastify.get(
    "/:provider/callback",
    {
      schema: {
        summary: "OAuth callback handler",
        security: [],
        params: z.object({ provider: z.enum(["wechat", "feishu"]) }),
        querystring: z.object({
          code: z.string(),
          state: z.string(),
        }),
      },
    },
    async (request, reply) => {
      cleanExpiredEntries();
      const { provider } = request.params as { provider: string };
      const { code, state } = request.query as { code: string; state: string };

      const stored = stateStore.get(state);
      stateStore.delete(state);
      if (!stored || stored.provider !== provider) {
        return reply.status(400).send({ error: "Invalid or expired state" });
      }

      try {
        let oauthInfo: {
          providerUserId: string;
          accessToken: string;
          refreshToken?: string;
          expiresIn: number;
          nickname: string | null;
          avatarUrl: string | null;
          email: string | null;
        };

        if (provider === "wechat") {
          const tokenData = await wechatExchangeToken(code);
          const userInfo = await wechatGetUserInfo(
            tokenData.accessToken,
            tokenData.openid,
          );
          oauthInfo = {
            providerUserId: userInfo.providerUserId,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresIn: tokenData.expiresIn,
            nickname: userInfo.nickname,
            avatarUrl: userInfo.avatarUrl,
            email: userInfo.email,
          };
        } else if (provider === "feishu") {
          const tokenData = await feishuExchangeToken(code);
          const userInfo = await feishuGetUserInfo(tokenData.accessToken);
          oauthInfo = {
            providerUserId: userInfo.providerUserId,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresIn: tokenData.expiresIn,
            nickname: userInfo.nickname,
            avatarUrl: userInfo.avatarUrl,
            email: userInfo.email,
          };
        } else {
          return reply.status(400).send({ error: "Unsupported provider" });
        }

        // 1. Check if this OAuth account is already bound
        const existingAccount = await findOAuthAccount(
          provider,
          oauthInfo.providerUserId,
        );
        if (existingAccount) {
          const user = await getUserById(existingAccount.userId);
          if (!user) {
            return reply.status(404).send({ error: "User not found" });
          }
          const tokens = await issueTokens(fastify, user.id, user.username);
          const redirect = getFrontendRedirectUrl(
            stored.redirectUri,
            "/oauth/success",
            {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            },
          );
          return reply.redirect(redirect);
        }

        // 2. Not bound yet — try auto-bind by email
        if (oauthInfo.email) {
          const userByEmail = await getUserByEmail(oauthInfo.email);
          if (userByEmail) {
            await createOAuthAccount({
              userId: userByEmail.id,
              provider,
              providerUserId: oauthInfo.providerUserId,
              providerEmail: oauthInfo.email,
              accessToken: oauthInfo.accessToken,
              refreshToken: oauthInfo.refreshToken ?? null,
              expiresAt: new Date(Date.now() + oauthInfo.expiresIn * 1000),
            });
            const tokens = await issueTokens(
              fastify,
              userByEmail.id,
              userByEmail.username,
            );
            const redirect = getFrontendRedirectUrl(
              stored.redirectUri,
              "/oauth/success",
              {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
              },
            );
            return reply.redirect(redirect);
          }
        }

        // 3. No existing user — generate temp token and redirect to bind page
        const tempToken = generateTempToken();
        tempBindStore.set(tempToken, {
          provider,
          providerUserId: oauthInfo.providerUserId,
          providerEmail: oauthInfo.email,
          nickname: oauthInfo.nickname,
          avatarUrl: oauthInfo.avatarUrl,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });

        const redirect = getFrontendRedirectUrl(
          stored.redirectUri,
          "/oauth/bind",
          {
            provider,
            tempToken,
            ...(oauthInfo.nickname
              ? { nickname: oauthInfo.nickname }
              : {}),
          },
        );
        return reply.redirect(redirect);
      } catch (err) {
        fastify.log.error(err);
        const redirect = getFrontendRedirectUrl(
          stored.redirectUri,
          "/oauth/error",
          {
            message:
              err instanceof Error ? err.message : "OAuth authentication failed",
          },
        );
        return reply.redirect(redirect);
      }
    },
  );

  // ─── POST /bind ─────────────────────────────────────────
  fastify.post(
    "/bind",
    {
      schema: {
        summary: "Bind OAuth account to existing user",
        security: [],
        body: z.object({
          tempToken: z.string(),
          username: z.string(),
          password: z.string(),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            user: z.object({
              id: z.string(),
              username: z.string(),
              email: z.string(),
              role: z.string(),
              avatarUrl: z.string().nullable(),
            }),
          }),
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      cleanExpiredEntries();
      const { tempToken, username, password } = request.body as {
        tempToken: string;
        username: string;
        password: string;
      };

      const temp = tempBindStore.get(tempToken);
      if (!temp) {
        return reply.status(400).send({ error: "Invalid or expired token" });
      }
      tempBindStore.delete(tempToken);

      const user = await findUserByIdentifier(username);
      if (!user || !user.password) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      await createOAuthAccount({
        userId: user.id,
        provider: temp.provider,
        providerUserId: temp.providerUserId,
        providerEmail: temp.providerEmail,
      });

      const tokens = await issueTokens(fastify, user.id, user.username);
      return reply.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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

  // ─── POST /register-and-bind ────────────────────────────
  fastify.post(
    "/register-and-bind",
    {
      schema: {
        summary: "Register new user and bind OAuth account",
        security: [],
        body: z.object({
          tempToken: z.string(),
          username: z.string().min(2),
          email: z.string().email(),
        }),
        response: {
          201: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            user: z.object({
              id: z.string(),
              username: z.string(),
              email: z.string(),
              role: z.string(),
              avatarUrl: z.string().nullable(),
            }),
          }),
          400: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      cleanExpiredEntries();
      const { tempToken, username, email } = request.body as {
        tempToken: string;
        username: string;
        email: string;
      };

      const temp = tempBindStore.get(tempToken);
      if (!temp) {
        return reply.status(400).send({ error: "Invalid or expired token" });
      }

      const existingByUsername = await findUserByIdentifier(username);
      if (existingByUsername) {
        return reply.status(409).send({ error: "Username already taken" });
      }
      const existingByEmail = await getUserByEmail(email);
      if (existingByEmail) {
        return reply.status(409).send({ error: "Email already taken" });
      }

      const newUser = {
        id: crypto.randomUUID(),
        username,
        email,
        role: "viewer" as const,
        status: "offline" as const,
        lastLogin: null,
        avatarUrl: temp.avatarUrl,
      };

      await addUser({ ...newUser, password: null });
      tempBindStore.delete(tempToken);

      await createOAuthAccount({
        userId: newUser.id,
        provider: temp.provider,
        providerUserId: temp.providerUserId,
        providerEmail: temp.providerEmail,
      });

      const tokens = await issueTokens(fastify, newUser.id, newUser.username);
      return reply.status(201).send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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

  // ─── DELETE /:provider ───────────────────────────────────
  fastify.delete(
    "/:provider",
    {
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
      schema: {
        summary: "Unlink OAuth provider",
        params: z.object({ provider: z.string() }),
        response: {
          200: z.object({ ok: z.literal(true) }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { provider } = request.params as { provider: string };
      const payload = request.user as { userId: string };
      const ok = await unlinkOAuthAccount(payload.userId, provider);
      if (!ok) {
        return reply.status(404).send({ error: "Provider not linked" });
      }
      return reply.send({ ok: true });
    },
  );

  // ─── GET /linked ──────────────────────────────────────
  fastify.get(
    "/linked",
    {
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
      schema: {
        summary: "Get linked OAuth accounts",
        response: {
          200: z.array(
            z.object({
              provider: z.string(),
              providerUserId: z.string(),
              providerEmail: z.string().nullable(),
              createdAt: z.date().nullable(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as { userId: string };
      const accounts = await getUserOAuthAccounts(payload.userId);
      return reply.send(accounts);
    },
  );
}
