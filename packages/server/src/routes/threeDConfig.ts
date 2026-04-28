import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ThreeDConfigSchema } from "@ecoctrl/shared";
import { findThreeDConfig, updateThreeDConfig } from "@/repositories/threeDConfig";

const configBodySchema = z.object({
  cameraPreset: z.string().optional(),
  ambientLightIntensity: z.number().optional(),
  hotspots: z.array(z.unknown()).optional(),
  labels: z.array(z.unknown()).optional(),
});

export default async function threeDConfigRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["3D"],
        summary: "Get 3D config",
        response: { 200: ThreeDConfigSchema },
      },
    },
    async (_request, reply) => {
      const config = await findThreeDConfig();
      return reply.send(
        config ?? {
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
        tags: ["3D"],
        summary: "Update 3D config",
        body: configBodySchema,
        response: { 200: ThreeDConfigSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        cameraPreset?: string;
        ambientLightIntensity?: number;
        hotspots?: unknown[];
        labels?: unknown[];
      };
      const existing = await findThreeDConfig();
      const updated = {
        cameraPreset: body.cameraPreset ?? existing?.cameraPreset ?? "Default_View_01",
        ambientLightIntensity:
          body.ambientLightIntensity ?? existing?.ambientLightIntensity ?? 0.85,
        hotspots: body.hotspots ?? existing?.hotspots ?? [],
        labels: body.labels ?? existing?.labels ?? [],
      };
      const result = await updateThreeDConfig(updated);
      return reply.send(result);
    },
  );
}
