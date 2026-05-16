import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  DashboardModelConfigSchema,
  DashboardModelHotspotSchema,
  DashboardModelLabelSchema,
} from "@ecoctrl/shared";
import { findDashboardModel, updateDashboardModel } from "@/repositories/dashboardModel";
import { getModelStorage } from "@/storage";
import { errors } from "@/lib/schemas";

const storage = getModelStorage();

const configBodySchema = z.object({
  modelFileUrl: z.string().nullable().optional(),
  cameraPreset: z.string().optional(),
  ambientLightIntensity: z.number().optional(),
  hotspots: z.array(DashboardModelHotspotSchema).optional(),
  labels: z.array(DashboardModelLabelSchema).optional(),
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
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const parts = request.parts();
      let fileBuffer: Buffer | undefined;
      let originalName = "";

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          fileBuffer = Buffer.concat(chunks);
          originalName = part.filename;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const fileId = crypto.randomUUID();
      const ext = originalName.includes(".")
        ? originalName.slice(originalName.lastIndexOf("."))
        : "";
      const key = `dashboard/${fileId}${ext}`;

      await storage.put(key, fileBuffer);

      const existing = await findDashboardModel();
      const updated = await updateDashboardModel({
        modelFileUrl: key,
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
        modelFileUrl?: string | null;
        cameraPreset?: string;
        ambientLightIntensity?: number;
        hotspots?: unknown[];
        labels?: unknown[];
      };
      const existing = await findDashboardModel();
      const updated = {
        modelFileUrl:
          body.modelFileUrl !== undefined ? body.modelFileUrl : (existing?.modelFileUrl ?? null),
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
