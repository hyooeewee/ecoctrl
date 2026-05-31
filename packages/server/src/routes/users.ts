import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  UserSchema,
  UserCreateBodySchema,
  UserUpdateBodySchema,
  USER_ROLE_LIST,
} from "@ecoctrl/shared";
import type { User, UserCreateBody, UserUpdateBody } from "@ecoctrl/shared";
import {
  findManyUsers,
  createUser,
  deleteUser,
  updateUser,
  findUserByIdWithPassword,
  findUserById,
  findUserPreferences,
  updateUserPreferences,
} from "@/repositories/users";
import { getFileStorage } from "@/storage";
import { streamFile } from "@/storage/stream";
import { errors } from "@/lib/schemas";
import type { UserPreferences } from "@ecoctrl/shared";

const storage = getFileStorage();

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function isExternalUrl(url: string | null): boolean {
  return !!url && /^https?:/i.test(url);
}

const successSchema = z.object({ success: z.boolean() });

export default async function accountRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Users"],
        summary: "Get user list",
        response: { 200: z.array(UserSchema) },
      },
    },
    async (_request, reply) => {
      const users: User[] = await findManyUsers();
      return reply.send(users);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Users"],
        summary: "Create a user",
        body: UserCreateBodySchema,
        response: { 201: UserSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as UserCreateBody;
      const hashedPassword = await bcrypt.hash(body.password, 10);
      const newUser = await createUser({
        username: body.username ?? "",
        email: body.email,
        role: body.role ?? USER_ROLE_LIST[USER_ROLE_LIST.length - 1],
        status: "offline",
        lastLogin: null,
        avatarUrl: null,
        password: hashedPassword,
      });
      return reply.status(201).send(newUser);
    },
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Users"],
        summary: "Update a user",
        params: z.object({ id: z.string().describe("User ID") }),
        body: UserUpdateBodySchema,
        response: {
          200: successSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UserUpdateBody & { oldPassword?: string };

      if (body.password && body.oldPassword) {
        const user = await findUserByIdWithPassword(id);
        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }
        const valid = await bcrypt.compare(body.oldPassword, user.password!);
        if (!valid) {
          return reply.status(403).send({ error: "原密码错误" });
        }
        body.password = await bcrypt.hash(body.password, 10);
        delete (body as Record<string, unknown>).oldPassword;
      } else if (body.password) {
        body.password = await bcrypt.hash(body.password, 10);
      }

      // Delete old avatar from storage if avatarUrl is being updated to a different value
      if (body.avatarUrl !== undefined) {
        const oldUser = await findUserById(id);
        if (
          oldUser?.avatarUrl &&
          oldUser.avatarUrl !== body.avatarUrl &&
          !isExternalUrl(oldUser.avatarUrl)
        ) {
          await storage.delete(oldUser.avatarUrl).catch(() => {});
        }
      }

      const updated = await updateUser(id, body);
      if (!updated) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send({ success: true });
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Users"],
        summary: "Delete a user",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: successSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await deleteUser(id);
      if (!deleted) {
        return reply.status(404).send({ error: "User not found" });
      }
      if (deleted.avatarUrl && !isExternalUrl(deleted.avatarUrl)) {
        await storage.delete(deleted.avatarUrl).catch(() => {});
      }
      return reply.send({ success: true });
    },
  );

  // ─── Avatar ─────────────────────────────────────────────────────────────────

  fastify.post(
    "/:id/avatar",
    {
      schema: {
        tags: ["Users"],
        summary: "Upload user avatar",
        consumes: ["multipart/form-data"],
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: z.object({ url: z.string() }),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const user = await findUserById(id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const parts = request.parts();
      let fileBuffer: Buffer | undefined;
      let originalName = "";

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          fileBuffer = Buffer.concat(chunks);
          originalName = part.filename;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const ext = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) {
        return reply.status(400).send({
          error: `Invalid file type. Allowed: ${Array.from(ALLOWED_EXTS).join(", ")}`,
        });
      }

      const safeName = `${crypto.randomUUID()}${ext}`;
      const key = `avatars/${id}/${safeName}`;
      await storage.put(key, fileBuffer, { contentType: MIME_MAP[ext] || "image/jpeg" });

      // Delete old avatar from storage
      if (user.avatarUrl && !isExternalUrl(user.avatarUrl)) {
        await storage.delete(user.avatarUrl).catch(() => {});
      }

      await updateUser(id, { avatarUrl: key });

      return reply.send({ url: key });
    },
  );

  fastify.get(
    "/:id/avatar",
    {
      schema: {
        tags: ["Users"],
        summary: "Get user avatar",
        params: z.object({ id: z.string().describe("User ID") }),
        response: { ...errors },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await findUserById(id);
      if (!user?.avatarUrl) {
        return reply.status(404).send({ error: "Avatar not found" });
      }

      // External OAuth avatar — redirect directly
      if (isExternalUrl(user.avatarUrl)) {
        return reply.redirect(user.avatarUrl);
      }

      return streamFile(storage, user.avatarUrl, reply, { request });
    },
  );

  // ─── Preferences ────────────────────────────────────────────────────────────

  fastify.get(
    "/:id/preferences",
    {
      schema: {
        tags: ["Users"],
        summary: "Get user preferences",
        params: z.object({ id: z.string().describe("User ID") }),
        response: { 200: z.record(z.string(), z.unknown()) },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const prefs = await findUserPreferences(id);
      return reply.send(prefs);
    },
  );

  fastify.put(
    "/:id/preferences",
    {
      schema: {
        tags: ["Users"],
        summary: "Update user preferences",
        params: z.object({ id: z.string().describe("User ID") }),
        body: z.record(z.string(), z.unknown()),
        response: {
          200: successSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UserPreferences;
      const user = await findUserById(id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      await updateUserPreferences(id, body);
      return reply.send({ success: true });
    },
  );

  fastify.patch(
    "/:id/preferences",
    {
      schema: {
        tags: ["Users"],
        summary: "Patch user preferences (merge)",
        params: z.object({ id: z.string().describe("User ID") }),
        body: z.record(z.string(), z.unknown()),
        response: {
          200: successSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UserPreferences;
      const user = await findUserById(id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      const current = await findUserPreferences(id);
      const merged = { ...current, ...body };
      await updateUserPreferences(id, merged);
      return reply.send({ success: true });
    },
  );

  fastify.delete(
    "/:id/preferences",
    {
      schema: {
        tags: ["Users"],
        summary: "Clear user preferences",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: successSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await findUserById(id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      await updateUserPreferences(id, {});
      return reply.send({ success: true });
    },
  );
}
