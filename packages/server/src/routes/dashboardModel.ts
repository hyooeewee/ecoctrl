import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardModelConfigSchema,
  DashboardModelHotspotSchema,
  DashboardModelLabelSchema,
  ModelFileEntrySchema,
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
      const parts = request.parts();
      const uploadedFiles: { buffer: Buffer; originalName: string }[] = [];

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          uploadedFiles.push({
            buffer: Buffer.concat(chunks),
            originalName: part.filename,
          });
        }
      }

      if (uploadedFiles.length === 0) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const existing = await findDashboardModel();
      const modelFiles = existing?.modelFiles ? [...existing.modelFiles] : [];

      for (const file of uploadedFiles) {
        const fileId = crypto.randomUUID();
        const ext = file.originalName.includes(".")
          ? file.originalName.slice(file.originalName.lastIndexOf("."))
          : "";
        const key = `${fileId}${ext}`;

        await storage.put(key, file.buffer);

        modelFiles.push({
          id: fileId,
          fileKey: key,
          name: file.originalName,
          priority: "background",
        });
      }

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
        modelFiles?: { id: string; fileKey: string; name?: string; priority?: string }[];
        cameraPreset?: string;
        ambientLightIntensity?: number;
        hotspots?: unknown[];
        labels?: unknown[];
      };
      const existing = await findDashboardModel();
      const updated = {
        modelFileUrl:
          body.modelFileUrl !== undefined ? body.modelFileUrl : (existing?.modelFileUrl ?? null),
        modelFiles: body.modelFiles ?? existing?.modelFiles ?? [],
        cameraPreset: body.cameraPreset ?? existing?.cameraPreset ?? "Default_View_01",
        ambientLightIntensity:
          body.ambientLightIntensity ?? existing?.ambientLightIntensity ?? 0.85,
        hotspots: body.hotspots ?? existing?.hotspots ?? [],
        labels: body.labels ?? existing?.labels ?? [],
      };
      const result = await updateDashboardModel(updated);
      if (result?.modelFileUrl) {
        result.modelFileUrl = "/api/dashboard-model/file";
      }
      return reply.send(result);
    },
  );
}
