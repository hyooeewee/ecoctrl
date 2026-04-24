import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ThreeDConfigSchema } from "@ecoctrl/shared";
import { getThreeDConfig, setThreeDConfig } from "@/repositories/threeDConfig";

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
        summary: "Get 3D config",
        response: { 200: ThreeDConfigSchema },
      },
    },
    async (_request, reply) => {
      const config = await getThreeDConfig();
      return reply.send(config ?? { cameraPreset: "Default_View_01", ambientLightIntensity: 0.85, hotspots: [], labels: [] });
    },
  );

  fastify.put(
    "/",
    {
      schema: {
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
      const existing = await getThreeDConfig();
      const updated = {
        cameraPreset: body.cameraPreset ?? existing?.cameraPreset ?? "Default_View_01",
        ambientLightIntensity: body.ambientLightIntensity ?? existing?.ambientLightIntensity ?? 0.85,
        hotspots: body.hotspots ?? existing?.hotspots ?? [],
        labels: body.labels ?? existing?.labels ?? [],
      };
      await setThreeDConfig(updated);
      return reply.send(updated);
    },
  );
}
