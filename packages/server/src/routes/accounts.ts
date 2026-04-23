import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserSchema, UserCreateBodySchema, UserUpdateBodySchema, USER_ROLE_LIST } from "@ecoctrl/shared";
import type { User, UserCreateBody, UserUpdateBody } from "@ecoctrl/shared";
import { getUsers, addUser, removeUser, updateUser, getUserByIdWithPassword, getUserById } from "@/repositories/users";
import { UPLOAD_DIR } from "@/lib/paths";

const AVATAR_DIR = path.join(UPLOAD_DIR, "avatar");
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function ensureAvatarDir() {
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
}

function deleteOldAvatar(avatarUrl: string | null) {
  if (!avatarUrl) return;
  const prefix = "/uploads/avatar/";
  if (avatarUrl.startsWith(prefix)) {
    const filename = avatarUrl.slice(prefix.length);
    const filePath = path.join(AVATAR_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

const successSchema = z.object({ success: z.boolean() });
const errorResponseSchema = z.object({ error: z.string() });

export default async function accountRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get user list",
        response: { 200: z.array(UserSchema) },
      },
    },
    async (_request, reply) => {
      const users: User[] = await getUsers();
      return reply.send(users);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        summary: "Create a user",
        body: UserCreateBodySchema,
        response: { 201: UserSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as UserCreateBody;
      const hashedPassword = await bcrypt.hash(body.password, 10);
      const newUser: User = {
        id: crypto.randomUUID(),
        username: body.username ?? "",
        email: body.email,
        role: body.role ?? USER_ROLE_LIST[USER_ROLE_LIST.length - 1],
        status: "offline",
        lastLogin: null,
        avatarUrl: null,
      };
      await addUser({ ...newUser, password: hashedPassword });
      return reply.status(201).send(newUser);
    },
  );

  fastify.put(
    "/:id",
    {
      schema: {
        summary: "Update a user",
        params: z.object({ id: z.string().describe("User ID") }),
        body: UserUpdateBodySchema,
        response: {
          200: successSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UserUpdateBody & { oldPassword?: string };

      if (body.password && body.oldPassword) {
        const user = await getUserByIdWithPassword(id);
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

      // Delete old avatar file if avatarUrl is being updated to a different value
      if (body.avatarUrl !== undefined) {
        const oldUser = await getUserById(id);
        if (oldUser?.avatarUrl && oldUser.avatarUrl !== body.avatarUrl) {
          deleteOldAvatar(oldUser.avatarUrl);
        }
      }

      const ok = await updateUser(id, body);
      if (!ok) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send({ success: true });
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a user",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: successSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await removeUser(id);
      if (!ok) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send({ success: true });
    },
  );

  // ─── Avatar ─────────────────────────────────────────────────────────────────

  fastify.post(
    "/:id/avatar",
    {
      schema: {
        summary: "Upload user avatar",
        consumes: ["multipart/form-data"],
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: z.object({ url: z.string() }),
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      ensureAvatarDir();
      const { id } = request.params as { id: string };

      const user = await getUserById(id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const parts = request.parts();
      let tempPath: string | undefined;
      let originalName: string | undefined;

      for await (const part of parts) {
        if (part.type === "file") {
          tempPath = path.join(AVATAR_DIR, `tmp-${crypto.randomUUID()}`);
          await pipeline(part.file, fs.createWriteStream(tempPath));
          originalName = part.filename;
        }
      }

      if (!tempPath || !originalName) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const ext = path.extname(originalName).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) {
        fs.unlinkSync(tempPath);
        return reply.status(400).send({
          error: `Invalid file type. Allowed: ${Array.from(ALLOWED_EXTS).join(", ")}`,
        });
      }

      const safeName = `${crypto.randomUUID()}${ext}`;
      const dest = path.join(AVATAR_DIR, safeName);
      fs.renameSync(tempPath, dest);

      // Delete old avatar file
      if (user.avatarUrl) {
        deleteOldAvatar(user.avatarUrl);
      }

      const url = `/uploads/avatar/${safeName}`;
      await updateUser(id, { avatarUrl: url });

      return reply.send({ url });
    },
  );

  fastify.get(
    "/:id/avatar",
    {
      schema: {
        summary: "Get user avatar",
        params: z.object({ id: z.string().describe("User ID") }),
        response: { 404: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await getUserById(id);
      if (!user?.avatarUrl) {
        return reply.status(404).send({ error: "Avatar not found" });
      }

      const prefix = "/uploads/avatar/";
      if (!user.avatarUrl.startsWith(prefix)) {
        // External URL — redirect
        return reply.redirect(user.avatarUrl);
      }

      const filename = user.avatarUrl.slice(prefix.length);
      const filePath = path.join(AVATAR_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "Avatar file not found" });
      }

      const ext = path.extname(filename).toLowerCase();
      const contentType = MIME_MAP[ext] || "image/jpeg";
      const stream = fs.createReadStream(filePath);
      return reply.type(contentType).send(stream);
    },
  );
}
