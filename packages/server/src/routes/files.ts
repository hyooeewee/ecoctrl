import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getStorage } from "@/storage";
import {
  findManyFiles,
  findFileById,
  createFile,
  updateFile,
  deleteFile,
} from "@/repositories/files";
import { errors } from "@/lib/schemas";

const fileItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  filename: z.string(),
  mimeType: z.string().nullable(),
  size: z.number(),
  fileUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
});

export default async function fileRoutes(fastify: FastifyInstance) {
  const storage = getStorage();

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Files"],
        summary: "List uploaded files",
        response: { 200: z.array(fileItemSchema) },
      },
    },
    async (_request, reply) => {
      const items = await findManyFiles();
      return reply.send(items);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Files"],
        summary: "Upload a file",
        consumes: ["multipart/form-data"],
        response: {
          201: fileItemSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const parts = request.parts();
      let fileBuffer: Buffer | undefined;
      let fileName = "";
      let mimeType = "application/octet-stream";
      let name = "";

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          fileBuffer = Buffer.concat(chunks);
          fileName = part.filename;
          mimeType = part.mimetype || "application/octet-stream";
        } else {
          if (part.fieldname === "name") name = part.value as string;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const fileId = crypto.randomUUID();
      const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
      const key = `files/${fileId}${ext}`;

      await storage.put(key, fileBuffer, { contentType: mimeType });

      const finalName = name || fileName.replace(/\.[^/.]+$/, "");

      const created = await createFile({
        name: finalName,
        filename: key,
        mimeType,
        size: fileBuffer.length,
        fileUrl: key,
      });
      return reply.status(201).send(created);
    },
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Files"],
        summary: "Download raw file",
        params: z.object({ id: z.string().describe("File ID") }),
        response: { ...errors },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const file = await findFileById(id);
      if (!file) {
        return reply.status(404).send({ error: "File not found" });
      }

      const url = await storage.getUrl(file.filename);
      return reply.redirect(url);
    },
  );

  fastify.get(
    "/:id/preview",
    {
      schema: {
        tags: ["Files"],
        summary: "Preview a file",
        params: z.object({ id: z.string().describe("File ID") }),
        response: { ...errors },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const file = await findFileById(id);
      if (!file) {
        return reply.status(404).send({ error: "File not found" });
      }

      const url = await storage.getUrl(file.filename);
      return reply.redirect(url);
    },
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["Files"],
        summary: "Update file name",
        params: z.object({ id: z.string().describe("File ID") }),
        body: z.object({ name: z.string().min(1) }),
        response: {
          200: fileItemSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name } = request.body as { name: string };
      const updated = await updateFile(id, { name });
      if (!updated) {
        return reply.status(404).send({ error: "File not found" });
      }
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Files"],
        summary: "Delete a file",
        params: z.object({ id: z.string().describe("File ID") }),
        response: {
          200: z.object({ success: z.boolean() }),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const file = await findFileById(id);
      if (!file) {
        return reply.status(404).send({ error: "File not found" });
      }

      await storage.delete(file.filename);
      await deleteFile(id);
      return reply.send({ success: true });
    },
  );
}
