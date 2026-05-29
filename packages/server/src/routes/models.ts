import type { FastifyInstance } from "fastify";
import { z } from "zod";
import JSZip from "jszip";
import { DataModelSchema } from "@ecoctrl/shared";
import { getModelStorage } from "@/storage";
import {
  findManyModels,
  findModelById,
  findModelByCode,
  createModel,
  updateModel,
  deleteModel,
} from "@/repositories/models";
import { findObjectByCodeAndModelId, createObject, updateObject } from "@/repositories/objects";
import { createPoint, findPointByObjectTypeNo } from "@/repositories/points";
import { errors } from "@/lib/schemas";
import { parseJsonPoints, parseCsvPoints, parseXlsxPoints } from "@/lib/parsers";
import { getLogger } from "@/lib/logger";

const storage = getModelStorage();
const logger = getLogger("models");

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
        response: { 200: z.array(DataModelSchema) },
      },
    },
    async (_request, reply) => {
      const items = await findManyModels();
      const resolved = await Promise.all(
        items.map(async (item) => ({
          ...item,
          fileUrl: item.fileUrl ? await storage.getUrl(item.fileUrl) : null,
        })),
      );
      return reply.send(resolved);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Models"],
        summary: "Upload a 3D model",
        response: {
          201: DataModelSchema,
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
      let code = "";

      for await (const part of parts) {
        if (part.type === "file") {
          fileBuffer = await collectStream(part.file);
          filename = part.filename;
        } else {
          if (part.fieldname === "name") name = part.value as string;
          if (part.fieldname === "version") version = part.value as string;
          if (part.fieldname === "code") code = part.value as string;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const finalName = name || filename.replace(/\.[^/.]+$/, "");
      const finalVersion = version || "v1.0";

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
          const key = `${modelId}/${entryName}`;
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

        fileUrl = `${modelId}/${gltfEntryName}`;
        format = "GLTF";
      } else {
        sizeBytes = fileBuffer.length;
        const key = `${modelId}${ext}`;
        await storage.put(key, fileBuffer);
        fileUrl = key;
        format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
      }

      const created = await createModel({
        code,
        name: finalName,
        description: null,
        version: finalVersion,
        format,
        size: formatFileSize(sizeBytes),
        fileUrl,
        thumbnailUrl: null,
        docUrl: null,
      });
      const response = {
        ...created,
        fileUrl: created.fileUrl ? await storage.getUrl(created.fileUrl) : null,
      };
      return reply.status(201).send(response);
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
          name: z.string().optional(),
          version: z.string().optional(),
          code: z.string().optional(),
          fileUrl: z.string().nullable().optional(),
        }),
        response: {
          200: DataModelSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, version, code, fileUrl } = request.body as {
        name?: string;
        version?: string;
        code?: string;
        fileUrl?: string | null;
      };

      const existing = await findModelById(id);
      if (!existing) {
        return reply.status(404).send({ error: "Model not found" });
      }

      // Delete old files when fileUrl is explicitly set to null
      if (fileUrl === null && existing.fileUrl) {
        const keys = await storage.list(`${id}/`);
        for (const key of keys) {
          await storage.delete(key);
        }
      }

      const updated = await updateModel(id, { name, version, code, fileUrl });
      if (!updated) {
        return reply.status(404).send({ error: "Model not found" });
      }
      const response = {
        ...updated,
        fileUrl: updated.fileUrl ? await storage.getUrl(updated.fileUrl) : null,
      };
      return response;
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
          200: DataModelSchema,
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
        const keys = await storage.list(`${id}/`);
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
          const key = `${id}/${entryName}`;
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

        fileUrl = `${id}/${gltfEntryName}`;
        format = "GLTF";
      } else {
        sizeBytes = fileBuffer.length;
        const key = `${id}${ext}`;
        await storage.put(key, fileBuffer);
        fileUrl = key;
        format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
      }

      const updated = await updateModel(id, {
        format,
        size: formatFileSize(sizeBytes),
        fileUrl,
      });
      if (!updated) {
        return reply.status(404).send({ error: "Model not found" });
      }
      const response = {
        ...updated,
        fileUrl: updated.fileUrl ? await storage.getUrl(updated.fileUrl) : null,
      };
      return response;
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

      // Cascade delete is handled by DB FK constraints (objects + points)
      const keys = await storage.list(`models/${id}/`);
      for (const key of keys) {
        await storage.delete(key);
      }

      await deleteModel(id);
      return reply.send({ success: true });
    },
  );

  const CONTENT_TYPE_MAP: Record<string, string> = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".zip": "application/zip",
  };

  function resolveContentType(fileUrl: string): string {
    const ext = fileUrl.slice(fileUrl.lastIndexOf(".")).toLowerCase();
    return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
  }

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

      const stream = await storage.get(model.fileUrl);
      return reply
        .header("Content-Type", resolveContentType(model.fileUrl))
        .header("Cache-Control", "public, max-age=3600")
        .send(stream);
    },
  );

  fastify.post(
    "/import-points",
    {
      schema: {
        tags: ["Models"],
        summary: "Import points from file (json/csv/xlsx)",
        consumes: ["multipart/form-data"],
        response: {
          200: z.object({
            createdModels: z.number(),
            createdObjects: z.number(),
            createdPoints: z.number(),
            skippedPoints: z.number(),
            devices: z.array(z.string()),
          }),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      try {
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

        const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
        let parseResult: {
          deviceType: string;
          devices: {
            deviceName: string;
            points: {
              name: string;
              pointType: string;
              pointNo: string;
              props: { key: string; name: string; unit?: string }[];
            }[];
          }[];
        };

        try {
          if (ext === ".xlsx") {
            parseResult = parseXlsxPoints(fileBuffer);
          } else if (ext === ".csv") {
            parseResult = parseCsvPoints(fileBuffer);
          } else if (ext === ".json") {
            parseResult = parseJsonPoints(fileBuffer);
          } else {
            return reply
              .status(400)
              .send({ error: "Unsupported file format. Use .json, .csv, or .xlsx" });
          }
        } catch (err) {
          return reply
            .status(400)
            .send({ error: err instanceof Error ? err.message : "Failed to parse file" });
        }

        const { deviceType, devices } = parseResult;

        // Find or create model by deviceType (model code)
        let model = await findModelByCode(deviceType);
        let createdModels = 0;

        if (!model) {
          model = await createModel({
            code: deviceType.toUpperCase(),
            name: null,
            description: null,
            version: null,
            format: null,
            size: null,
            fileUrl: null,
            thumbnailUrl: null,
            docUrl: null,
          });
          createdModels = 1;
        }

        let createdObjects = 0;
        let createdPoints = 0;
        let skippedPoints = 0;
        const deviceNames: string[] = [];

        for (const device of devices) {
          const deviceName = device.deviceName;
          deviceNames.push(deviceName);

          // Find or create object by code + modelId
          let object = await findObjectByCodeAndModelId(deviceName, model.id);
          if (!object) {
            object = await createObject({
              code: deviceName,
              name: null,
              description: null,
              modelId: model.id,
              status: "offline",
            });
            createdObjects++;
          }

          // Process each point: check existence, create if not exists
          for (const p of device.points) {
            const existing = await findPointByObjectTypeNo(object.id, p.pointType, p.pointNo);
            if (existing) {
              skippedPoints++;
              continue;
            }

            await createPoint({
              objectId: object.id,
              modelId: model.id,
              type: p.pointType,
              code: p.pointNo,
              name: p.name,
              description: null,
              props: p.props,
              values: {} as Record<string, string>,
            });
            createdPoints++;
          }
        }

        const response = {
          createdModels,
          createdObjects,
          createdPoints,
          skippedPoints,
          devices: deviceNames,
        };

        logger.info({ response }, "Import points completed");
        return reply.send(response);
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
          "Import points failed",
        );
        return reply
          .status(500)
          .send({ error: err instanceof Error ? err.message : "Internal server error" });
      }
    },
  );
}
