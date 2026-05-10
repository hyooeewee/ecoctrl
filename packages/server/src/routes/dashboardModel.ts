import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DashboardModelConfigSchema } from "@ecoctrl/shared";
import { findDashboardModel, updateDashboardModel } from "@/repositories/dashboardModel";

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
