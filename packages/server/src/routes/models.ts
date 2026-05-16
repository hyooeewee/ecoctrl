import type { FastifyInstance } from "fastify";
import { z } from "zod";
import JSZip from "jszip";
import { Model3DSchema, PointItemSchema } from "@ecoctrl/shared";
import type { PointItem } from "@ecoctrl/shared";
import { getStorage } from "@/storage";
import {
  findManyModels,
  findModelById,
  createModel,
  updateModel,
  deleteModel,
} from "@/repositories/models";
import { errors } from "@/lib/schemas";

const storage = getStorage();

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  zip: "ZIP",
};

async function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function modelRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Models"],
        summary: "Get 3D models",
        response: { 200: z.array(Model3DSchema) },
      },
    },
    async (_request, reply) => {
      const items = await findManyModels();
      return reply.send(items);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Models"],
        summary: "Upload a 3D model",
        response: {
          201: Model3DSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const parts = request.parts();
      let fileBuffer: Buffer | undefined;
      let filename = "";
      let name = "";
      let version = "";
      let deviceType = "";
      let pointsRaw = "";

      for await (const part of parts) {
        if (part.type === "file") {
          fileBuffer = await collectStream(part.file);
          filename = part.filename;
        } else {
          if (part.fieldname === "name") name = part.value as string;
          if (part.fieldname === "version") version = part.value as string;
          if (part.fieldname === "deviceType") deviceType = part.value as string;
          if (part.fieldname === "points") pointsRaw = part.value as string;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const finalName = name || filename.replace(/\.[^/.]+$/, "");
      const finalVersion = version || "v1.0";
      const points = pointsRaw ? JSON.parse(pointsRaw) : [];

      const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
      const modelId = crypto.randomUUID();
      let fileUrl: string;
      let format: string;
      let sizeBytes: number;

      if (ext === ".zip") {
        sizeBytes = fileBuffer.length;
        const zip = await JSZip.loadAsync(fileBuffer);
        const uploadedKeys: string[] = [];
        let gltfEntryName: string | undefined;

        for (const [entryName, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          const content = await entry.async("nodebuffer");
          const key = `models/${modelId}/${entryName}`;
          await storage.put(key, content);
          uploadedKeys.push(key);
          if (!gltfEntryName && entryName.toLowerCase().endsWith(".gltf")) {
            gltfEntryName = entryName;
          }
        }

        if (!gltfEntryName) {
          for (const key of uploadedKeys) {
            await storage.delete(key);
          }
          return reply.status(400).send({ error: "ZIP must contain a .gltf file" });
        }

        fileUrl = `models/${modelId}/${gltfEntryName}`;
        format = "GLTF";
      } else {
        sizeBytes = fileBuffer.length;
        const key = `models/${modelId}${ext}`;
        await storage.put(key, fileBuffer);
        fileUrl = key;
        format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
      }

      const created = await createModel({
        name: finalName,
        version: finalVersion,
        format,
        size: formatFileSize(sizeBytes),
        deviceType,
        fileUrl,
        thumbnailUrl: null,
        docUrl: null,
        points,
      });
      return reply.status(201).send(created);
    },
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Models"],
        summary: "Update model metadata",
        params: z.object({ id: z.string().describe("Model ID") }),
        body: z.object({
          name: z.string(),
          version: z.string(),
          deviceType: z.string(),
          points: z.array(PointItemSchema).default([]),
          fileUrl: z.string().nullable().optional(),
        }),
        response: {
          200: Model3DSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, version, deviceType, points, fileUrl } = request.body as {
        name: string;
        version: string;
        deviceType: string;
        points?: PointItem[];
        fileUrl?: string | null;
      };

      const existing = await findModelById(id);
      if (!existing) {
        return reply.status(404).send({ error: "Model not found" });
      }

      // Delete old files when fileUrl is explicitly set to null
      if (fileUrl === null && existing.fileUrl) {
        const keys = await storage.list(`models/${id}/`);
        for (const key of keys) {
          await storage.delete(key);
        }
      }

      const updated = await updateModel(id, { name, version, deviceType, points, fileUrl });
      if (!updated) {
        return reply.status(404).send({ error: "Model not found" });
      }
      return updated;
    },
  );

  fastify.put(
    "/:id/file",
    {
      schema: {
        tags: ["Models"],
        summary: "Replace model file",
        params: z.object({ id: z.string().describe("Model ID") }),
        response: {
          200: Model3DSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await findModelById(id);
      if (!existing) {
        return reply.status(404).send({ error: "Model not found" });
      }

      const parts = request.parts();
      let fileBuffer: Buffer | undefined;
      let filename = "";

      for await (const part of parts) {
        if (part.type === "file") {
          fileBuffer = await collectStream(part.file);
          filename = part.filename;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      // Delete old files
      if (existing.fileUrl) {
        const keys = await storage.list(`models/${id}/`);
        for (const key of keys) {
          await storage.delete(key);
        }
      }

      // Save new file (same logic as POST)
      const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
      let fileUrl: string;
      let format: string;
      let sizeBytes: number;

      if (ext === ".zip") {
        sizeBytes = fileBuffer.length;
        const zip = await JSZip.loadAsync(fileBuffer);
        const uploadedKeys: string[] = [];
        let gltfEntryName: string | undefined;

        for (const [entryName, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          const content = await entry.async("nodebuffer");
          const key = `models/${id}/${entryName}`;
          await storage.put(key, content);
          uploadedKeys.push(key);
          if (!gltfEntryName && entryName.toLowerCase().endsWith(".gltf")) {
            gltfEntryName = entryName;
          }
        }

        if (!gltfEntryName) {
          for (const key of uploadedKeys) {
            await storage.delete(key);
          }
          return reply.status(400).send({ error: "ZIP must contain a .gltf file" });
        }

        fileUrl = `models/${id}/${gltfEntryName}`;
        format = "GLTF";
      } else {
        sizeBytes = fileBuffer.length;
        const key = `models/${id}${ext}`;
        await storage.put(key, fileBuffer);
        fileUrl = key;
        format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
      }

      const updated = await updateModel(id, {
        format,
        size: formatFileSize(sizeBytes),
        fileUrl,
      });
      return updated;
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Models"],
        summary: "Delete a 3D model",
        params: z.object({ id: z.string().describe("Model ID") }),
        response: {
          200: z.object({ success: z.boolean() }),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const model = await findModelById(id);
      if (!model) {
        return reply.status(404).send({ error: "Model not found" });
      }

      const keys = await storage.list(`models/${id}/`);
      for (const key of keys) {
        await storage.delete(key);
      }

      await deleteModel(id);
      return reply.send({ success: true });
    },
  );

  fastify.get(
    "/:id/file",
    {
      schema: {
        tags: ["Models"],
        summary: "Get 3D model file",
        params: z.object({ id: z.string().describe("Model ID") }),
        response: {
          200: z.unknown(),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const model = await findModelById(id);
      if (!model || !model.fileUrl) {
        return reply.status(404).send({ error: "Model or file not found" });
      }

      const url = await storage.getUrl(model.fileUrl);
      return reply.redirect(url);
    },
  );
}
