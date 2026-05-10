import type { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { DashboardModelConfigSchema } from "@ecoctrl/shared";
import { findDashboardModel, updateDashboardModel } from "@/repositories/dashboardModel";
import { UPLOAD_DIR } from "@/lib/paths";

const MODELS_DIR = path.join(UPLOAD_DIR, "models");

function ensureModelsDir() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
}

const configBodySchema = z.object({
  modelFileUrl: z.string().optional(),
  cameraPreset: z.string().optional(),
  ambientLightIntensity: z.number().optional(),
  hotspots: z.array(z.unknown()).optional(),
  labels: z.array(z.unknown()).optional(),
});

export default async function dashboardModelRoutes(fastify: FastifyInstance) {
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
      return reply.send(
        config ?? {
          modelFileUrl: null,
          cameraPreset: "Default_View_01",
          ambientLightIntensity: 0.85,
          hotspots: [],
          labels: [],
        },
      );
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Upload dashboard model file",
        consumes: ["multipart/form-data"],
        response: {
          200: DashboardModelConfigSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      ensureModelsDir();

      const parts = request.parts();
      let fileInfo: { filename: string; tempPath: string } | undefined;

      for await (const part of parts) {
        if (part.type === "file") {
          const tempPath = path.join(MODELS_DIR, `upload-${crypto.randomUUID()}`);
          await pipeline(part.file, fs.createWriteStream(tempPath));
          fileInfo = { filename: part.filename, tempPath };
        }
      }

      if (!fileInfo) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const fileId = crypto.randomUUID();
      const ext = path.extname(fileInfo.filename);
      const safeName = `${fileId}${ext}`;
      const dest = path.join(MODELS_DIR, safeName);
      fs.renameSync(fileInfo.tempPath, dest);

      const modelFileUrl = `/static/models/${safeName}`;

      const existing = await findDashboardModel();
      const updated = await updateDashboardModel({
        modelFileUrl,
        cameraPreset: existing?.cameraPreset ?? "Default_View_01",
        ambientLightIntensity: existing?.ambientLightIntensity ?? 0.85,
        hotspots: existing?.hotspots ?? [],
        labels: existing?.labels ?? [],
      });

      return reply.send(updated);
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
        modelFileUrl?: string;
        cameraPreset?: string;
        ambientLightIntensity?: number;
        hotspots?: unknown[];
        labels?: unknown[];
      };
      const existing = await findDashboardModel();
      const updated = {
        modelFileUrl: body.modelFileUrl ?? existing?.modelFileUrl ?? null,
        cameraPreset: body.cameraPreset ?? existing?.cameraPreset ?? "Default_View_01",
        ambientLightIntensity:
          body.ambientLightIntensity ?? existing?.ambientLightIntensity ?? 0.85,
        hotspots: body.hotspots ?? existing?.hotspots ?? [],
        labels: body.labels ?? existing?.labels ?? [],
      };
      const result = await updateDashboardModel(updated);
      return reply.send(result);
    },
  );
}
