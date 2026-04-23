import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { UPLOAD_DIR as BASE_UPLOAD_DIR } from "@/lib/paths";
import { getFiles, getFileById, addFile, deleteFile } from "@/repositories/files";

const FILES_DIR = path.join(BASE_UPLOAD_DIR, "files");
const AVATAR_DIR = path.join(BASE_UPLOAD_DIR, "avatar");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function ensureDirs() {
  if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
  }
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
}

function isImage(ext: string): boolean {
  return IMAGE_EXTS.has(ext.toLowerCase());
}

function resolveFilePath(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const baseDir = isImage(ext) ? AVATAR_DIR : FILES_DIR;
  return path.join(baseDir, filename);
}

const fileItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  filename: z.string(),
  mimeType: z.string().nullable(),
  size: z.number(),
  fileUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
});

const errorResponseSchema = z.object({ error: z.string() });

export default async function fileRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "List uploaded files",
        response: { 200: z.array(fileItemSchema) },
      },
    },
    async (_request, reply) => {
      const items = await getFiles();
      return reply.send(items);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        summary: "Upload a file",
        consumes: ["multipart/form-data"],
        response: {
          201: fileItemSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      ensureDirs();

      const parts = request.parts();
      let fileInfo: { filename: string; tempPath: string } | undefined;
      let name = "";

      for await (const part of parts) {
        if (part.type === "file") {
          const tempPath = path.join(FILES_DIR, `upload-${crypto.randomUUID()}`);
          await pipeline(part.file, fs.createWriteStream(tempPath));
          fileInfo = { filename: part.filename, tempPath };
        } else {
          if (part.fieldname === "name") name = part.value as string;
        }
      }

      if (!fileInfo) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const fileId = crypto.randomUUID();
      const ext = path.extname(fileInfo.filename);
      const safeName = `${fileId}${ext}`;
      const isImg = isImage(ext);
      const destDir = isImg ? AVATAR_DIR : FILES_DIR;
      const dest = path.join(destDir, safeName);
      fs.renameSync(fileInfo.tempPath, dest);

      const stats = fs.statSync(dest);
      const mimeTypeMap: Record<string, string> = {
        ".pdf": "application/pdf",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };
      const mimeType = mimeTypeMap[ext.toLowerCase()] || "application/octet-stream";
      const finalName = name || fileInfo.filename.replace(/\.[^/.]+$/, "");
      const fileUrl = isImg ? `/uploads/avatar/${safeName}` : `/uploads/files/${safeName}`;

      const id = await addFile({
        name: finalName,
        filename: safeName,
        mimeType,
        size: stats.size,
        fileUrl,
      });

      const created = await getFileById(id);
      return reply.status(201).send(created!);
    },
  );

  fastify.get(
    "/:id",
    {
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
      schema: {
        summary: "Download raw file",
        params: z.object({ id: z.string().describe("File ID") }),
        response: { 404: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const file = await getFileById(id);
      if (!file) {
        return reply.status(404).send({ error: "File not found" });
      }

      const filePath = resolveFilePath(file.filename);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "File not found" });
      }

      const contentType = file.mimeType || "application/octet-stream";
      const stream = createReadStream(filePath);
      return reply.type(contentType).send(stream);
    },
  );

  fastify.get(
    "/:id/preview",
    {
      schema: {
        summary: "Preview a file",
        params: z.object({ id: z.string().describe("File ID") }),
        response: { 404: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const file = await getFileById(id);
      if (!file) {
        return reply.status(404).send({ error: "File not found" });
      }
      const filePath = resolveFilePath(file.filename);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "File not found" });
      }
      const contentType = file.mimeType || "application/octet-stream";
      const stream = createReadStream(filePath);
      return reply.type(contentType).send(stream);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a file",
        params: z.object({ id: z.string().describe("File ID") }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const file = await getFileById(id);
      if (!file) {
        return reply.status(404).send({ error: "File not found" });
      }

      const filePath = resolveFilePath(file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await deleteFile(id);
      return reply.send({ success: true });
    },
  );
}
