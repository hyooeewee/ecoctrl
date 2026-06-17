import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardModelConfigSchema,
  DashboardModelHotspotSchema,
  DashboardModelLabelSchema,
  ModelFileEntrySchema,
  type ModelFileEntry,
} from "@ecoctrl/shared";
import { findDashboardModel, updateDashboardModel } from "@/repositories/dashboardModel";
import { getModelStorage } from "@/storage";
import { streamFile } from "@/storage/stream";
import { errors } from "@/lib/schemas";

const storage = getModelStorage();

const configBodySchema = z.object({
  modelFileUrl: z.string().nullable().optional(),
  modelFiles: z.array(ModelFileEntrySchema).optional(),
  cameraPreset: z.string().optional(),
  ambientLightIntensity: z.number().optional(),
  hotspots: z.array(DashboardModelHotspotSchema).optional(),
  labels: z.array(DashboardModelLabelSchema).optional(),
});

export default async function dashboardModelRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/file",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Stream dashboard model file",
        security: [],
        response: { ...errors },
      },
    },
    async (request, reply) => {
      const { key } = request.query as { key?: string };
      const config = await findDashboardModel();
      const fileKey = key ?? config?.modelFileUrl;
      if (!fileKey) {
        return reply.status(404).send({ error: "No model file" });
      }
      return streamFile(storage, fileKey, reply, { request });
    },
  );

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Get dashboard model config",
        response: { 200: DashboardModelConfigSchema },
      },
    },
    async (_request, reply) => {
      const config = await findDashboardModel();
      const result = config ?? {
        modelFileUrl: null,
        modelFiles: [],
        cameraPreset: "Default_View_01",
        ambientLightIntensity: 0.85,
        hotspots: [],
        labels: [],
      };
      if (result.modelFileUrl) {
        result.modelFileUrl = "/api/dashboard-model/file";
      }
      return reply.send(result);
    },
  );

  fastify.post(
    "/",
    {
      bodyLimit: 5 * 1024 * 1024 * 1024, // 5GB cap for batch uploads (10 files × 500MB)
      schema: {
        tags: ["Dashboard"],
        summary: "Upload dashboard model file(s)",
        consumes: ["multipart/form-data"],
        response: {
          200: DashboardModelConfigSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      try {
        // Load existing config before streaming parts so we can compute the
        // insertion order without referencing a not-yet-declared variable.
        const existing = await findDashboardModel();
        const parts = request.parts();
        const uploadedMetas: ModelFileEntry[] = [];

        for await (const part of parts) {
          if (part.type === "file") {
            const fileId = crypto.randomUUID();
            const ext = part.filename.includes(".")
              ? part.filename.slice(part.filename.lastIndexOf("."))
              : "";
            const key = `${fileId}${ext}`;

            // Stream directly to S3 without buffering in memory
            await storage.put(key, part.file as unknown as ReadableStream);

            uploadedMetas.push({
              id: fileId,
              fileKey: key,
              name: part.filename,
              priority: "background",
              order: (existing?.modelFiles?.length ?? 0) + uploadedMetas.length,
            });
          }
        }

        if (uploadedMetas.length === 0) {
          return reply.status(400).send({ error: "No file uploaded" });
        }

        const modelFiles = existing?.modelFiles
          ? [...existing.modelFiles, ...uploadedMetas]
          : uploadedMetas;

        const updated = await updateDashboardModel({
          modelFileUrl: existing?.modelFileUrl ?? null,
          modelFiles,
          cameraPreset: existing?.cameraPreset ?? "Default_View_01",
          ambientLightIntensity: existing?.ambientLightIntensity ?? 0.85,
          hotspots: existing?.hotspots ?? [],
          labels: existing?.labels ?? [],
        });

        const response = {
          ...updated,
          modelFileUrl: updated.modelFileUrl ? "/api/dashboard-model/file" : null,
        };
        return reply.send(response);
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
    "/",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Update dashboard model config",
        body: configBodySchema,
        response: { 200: DashboardModelConfigSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        modelFileUrl?: string | null;
        modelFiles?: ModelFileEntry[];
        cameraPreset?: string;
        ambientLightIntensity?: number;
        hotspots?: unknown[];
        labels?: unknown[];
      };
      const existing = await findDashboardModel();
      const updated: Parameters<typeof updateDashboardModel>[0] = {
        modelFileUrl: (body.modelFileUrl !== undefined
          ? body.modelFileUrl
          : (existing?.modelFileUrl ?? null)) as string | null,
        modelFiles: (body.modelFiles ?? existing?.modelFiles ?? []) as Parameters<
          typeof updateDashboardModel
        >[0]["modelFiles"],
        cameraPreset: body.cameraPreset ?? existing?.cameraPreset ?? "Default_View_01",
        ambientLightIntensity:
          body.ambientLightIntensity ?? existing?.ambientLightIntensity ?? 0.85,
        hotspots: (body.hotspots ?? existing?.hotspots ?? []) as Parameters<
          typeof updateDashboardModel
        >[0]["hotspots"],
        labels: (body.labels ?? existing?.labels ?? []) as Parameters<
          typeof updateDashboardModel
        >[0]["labels"],
      };
      const result = await updateDashboardModel(updated);
      if (result?.modelFileUrl) {
        result.modelFileUrl = "/api/dashboard-model/file";
      }
      return reply.send(result);
    },
  );
}
