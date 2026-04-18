import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import type { FileMeta } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const META_FILE = path.join(__dirname, "../../uploads/files.json");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function loadMeta(): FileMeta[] {
  if (!fs.existsSync(META_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf-8")) as FileMeta[];
  } catch {
    return [];
  }
}

function saveMeta(meta: FileMeta[]) {
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

let fileMeta = loadMeta();

const fileItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    url: { type: "string" },
  },
};

const fileParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "File ID" },
  },
  required: ["id"],
};

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export default async function fileRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "List uploaded files",
        response: {
          200: {
            type: "array",
            items: fileItemSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const list = fileMeta.map((m) => ({
        id: m.id,
        name: m.name,
        url: `/api/files/${m.id}`,
      }));
      return reply.send(list);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        summary: "Upload a PDF file",
        consumes: ["multipart/form-data"],
        response: {
          200: fileItemSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const id = crypto.randomUUID();
      const originalName = data.filename;
      const safeName = `${id}-${originalName}`;
      const filePath = path.join(UPLOAD_DIR, safeName);

      await pipeline(data.file, fs.createWriteStream(filePath));

      const meta: FileMeta = {
        id,
        name: originalName.replace(/\.pdf$/i, ""),
        filename: safeName,
      };
      fileMeta.unshift(meta);
      saveMeta(fileMeta);

      return reply.send({
        id: meta.id,
        name: meta.name,
        url: `/api/files/${meta.id}`,
      });
    },
  );

  fastify.get(
    "/:id/preview",
    {
      schema: {
        summary: "Get HTML preview page for a file",
        params: fileParamsSchema,
        response: {
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const meta = fileMeta.find((m) => m.id === id);
      if (!meta) {
        return reply.status(404).send({ error: "File not found" });
      }
      const filePath = path.join(UPLOAD_DIR, meta.filename);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "File not found" });
      }
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #f3f4f6; }
  iframe { width: 100%; height: 100%; border: none; }
</style>
</head>
<body>
<iframe src="/api/files/${meta.id}" title="${meta.name}"></iframe>
</body>
</html>`;
      return reply.type("text/html").send(html);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a file",
        params: fileParamsSchema,
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
          },
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const index = fileMeta.findIndex((m) => m.id === id);
      if (index === -1) {
        return reply.status(404).send({ error: "File not found" });
      }
      const meta = fileMeta[index];
      const filePath = path.join(UPLOAD_DIR, meta.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fileMeta.splice(index, 1);
      saveMeta(fileMeta);
      return reply.send({ success: true });
    },
  );

  fastify.get(
    "/:id",
    {
      schema: {
        summary: "Download raw PDF file",
        params: fileParamsSchema,
        produces: ["application/pdf"],
        response: {
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const meta = fileMeta.find((m) => m.id === id);
      if (!meta) {
        return reply.status(404).send({ error: "File not found" });
      }
      const filePath = path.join(UPLOAD_DIR, meta.filename);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "File not found" });
      }
      return reply.type("application/pdf").send(fs.createReadStream(filePath));
    },
  );
}
