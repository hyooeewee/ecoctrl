import type { FastifyInstance } from "fastify";
import { getThreeDConfig, setThreeDConfig } from "@/repositories/threeDConfig";

const configSchema = {
  type: "object",
  properties: {
    cameraPreset: { type: "string" },
    ambientLightIntensity: { type: "number" },
    hotspots: { type: "array" },
    labels: { type: "array" },
  },
};

export default async function threeDConfigRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get 3D config",
        response: {
          200: configSchema,
        },
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
        body: {
          type: "object",
          properties: {
            cameraPreset: { type: "string" },
            ambientLightIntensity: { type: "number" },
            hotspots: { type: "array" },
            labels: { type: "array" },
          },
        },
        response: {
          200: configSchema,
        },
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
