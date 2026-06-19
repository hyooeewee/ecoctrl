import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Readable } from "node:stream";
import { DataModelSchema } from "@ecoctrl/shared";
import { getModelStorage } from "@/storage";
import { streamFile } from "@/storage/stream";
import {
  findManyModels,
  findModelById,
  findModelByCode,
  createModel,
  updateModel,
  deleteModel,
} from "@/repositories/models";
import { findObjectByCodeAndModelId, createObject } from "@/repositories/objects";
import { createPoint, findPointByObjectTypeNo } from "@/repositories/points";
import { createNotification } from "@/repositories/notifications";
import { emitEvent } from "@/lib/notifyTrigger";
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

async function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function toWebStream(stream: NodeJS.ReadableStream): ReadableStream {
  return Readable.toWeb(stream as Readable) as unknown as ReadableStream;
}

const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  obj: "OBJ",
  fbx: "FBX",
};

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
      return reply.send(items);
    },
  );

  fastify.post(
    "/",
    {
      bodyLimit: 5 * 1024 * 1024 * 1024, // 5GB cap for model uploads
      schema: {
        tags: ["Models"],
        summary: "Upload a 3D model",
        consumes: ["multipart/form-data"],
        response: {
          201: DataModelSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      try {
        const parts = request.parts();
        let filename = "";
        let name = "";
        let version = "";
        let code = "";
        let fileUrl = "";
        let format = "";
        let sizeBytes = 0;
        let fileProcessed = false;

        for await (const part of parts) {
          if (part.type === "file") {
            filename = part.filename;
            const modelId = crypto.randomUUID();
            const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();

            // Stream the model file directly to storage without buffering it
            // in memory. This avoids Cloudflare 524 origin timeouts on large
            // GLB uploads.
            const key = `${modelId}${ext}`;
            await storage.put(key, toWebStream(part.file));
            const fileStat = await storage.stat(key);

            fileUrl = key;
            sizeBytes = fileStat.size;
            format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
            fileProcessed = true;
          } else {
            if (part.fieldname === "name") name = part.value as string;
            if (part.fieldname === "version") version = part.value as string;
            if (part.fieldname === "code") code = part.value as string;
          }
        }

        if (!fileProcessed) {
          return reply.status(400).send({ error: "No file uploaded" });
        }

        const finalName = name || filename.replace(/\.[^/.]+$/, "");
        const finalVersion = version || "v1.0";

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
          fileUrl: created.fileUrl,
        };
        return reply.status(201).send(response);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "FST_FILES_LIMIT") {
          return reply.status(413).send({ error: "单次上传文件数量超过限制（最多 10 个）" });
        }
        if (code === "FST_REQ_FILE_TOO_LARGE") {
          return reply.status(413).send({ error: "单个文件大小超过 500MB 限制" });
        }
        throw err;
      }
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
        fileUrl: updated.fileUrl,
      };
      return response;
    },
  );

  fastify.put(
    "/:id/file",
    {
      bodyLimit: 5 * 1024 * 1024 * 1024, // 5GB cap for model uploads
      schema: {
        tags: ["Models"],
        summary: "Replace model file",
        params: z.object({ id: z.string().describe("Model ID") }),
        consumes: ["multipart/form-data"],
        response: {
          200: DataModelSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const existing = await findModelById(id);
        if (!existing) {
          return reply.status(404).send({ error: "Model not found" });
        }

        const parts = request.parts();
        let filename = "";
        let fileUrl = "";
        let format = "";
        let sizeBytes = 0;
        let fileProcessed = false;

        for await (const part of parts) {
          if (part.type === "file") {
            filename = part.filename;
            const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();

            const key = `${id}${ext}`;
            await storage.put(key, toWebStream(part.file));
            const fileStat = await storage.stat(key);

            fileUrl = key;
            sizeBytes = fileStat.size;
            format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
            fileProcessed = true;
          }
        }

        if (!fileProcessed) {
          return reply.status(400).send({ error: "No file uploaded" });
        }

        // Delete old files after the new file is successfully stored so the
        // model never ends up without a file if the upload fails partway.
        if (existing.fileUrl) {
          const keys = await storage.list(`${id}/`);
          await Promise.all(keys.map((key) => storage.delete(key)));
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
          fileUrl: updated.fileUrl,
        };
        return response;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "FST_FILES_LIMIT") {
          return reply.status(413).send({ error: "单次上传文件数量超过限制（最多 10 个）" });
        }
        if (code === "FST_REQ_FILE_TOO_LARGE") {
          return reply.status(413).send({ error: "单个文件大小超过 500MB 限制" });
        }
        throw err;
      }
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

  fastify.get(
    "/:id/file",
    {
      schema: {
        tags: ["Models"],
        summary: "Get 3D model file",
        security: [],
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

      return streamFile(storage, model.fileUrl, reply, { request });
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
              description?: string;
              region?: string;
              system?: string;
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
              description: p.description ?? null,
              region: p.region ?? null,
              system: p.system ?? null,
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

        // Fire-and-forget: create a notification and broadcast via SSE. Failures
        // here should not fail the import response.
        createNotification({
          title: "点位导入完成",
          message: `成功导入 ${response.createdPoints} 个点位，跳过 ${response.skippedPoints} 个已存在点位。`,
        })
          .then((notification) => {
            emitEvent("notification", {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              read: notification.read,
              createdAt: notification.createdAt?.toISOString() ?? null,
            });
          })
          .catch((notifyErr) => {
            logger.error(
              { err: notifyErr instanceof Error ? notifyErr.message : String(notifyErr) },
              "Failed to emit import notification",
            );
          });

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
