import type { FastifyInstance } from "fastify";
import { getPlatformConfig, setPlatformConfig } from "@/repositories/platformConfig";

const configSchema = {
  type: "object",
  properties: {
    platformName: { type: "string" },
    refreshInterval: { type: "number" },
    realtimeAlertEnabled: { type: "boolean" },
    darkModeFollowSystem: { type: "boolean" },
  },
};

export default async function configRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get platform config",
        response: {
          200: configSchema,
        },
      },
    },
    async (_request, reply) => {
      const config = await getPlatformConfig();
      return reply.send(
        config ?? {
          platformName: "EcoCtrl 能管平台",
          refreshInterval: 30,
          realtimeAlertEnabled: true,
          darkModeFollowSystem: false,
        },
      );
    },
  );

  fastify.put(
    "/",
    {
      schema: {
        summary: "Update platform config",
        body: {
          type: "object",
          properties: {
            platformName: { type: "string" },
            refreshInterval: { type: "number" },
            realtimeAlertEnabled: { type: "boolean" },
            darkModeFollowSystem: { type: "boolean" },
          },
        },
        response: {
          200: configSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        platformName?: string;
        refreshInterval?: number;
        realtimeAlertEnabled?: boolean;
        darkModeFollowSystem?: boolean;
      };
      const existing = await getPlatformConfig();
      const updated = {
        platformName: body.platformName ?? existing?.platformName ?? "EcoCtrl 能管平台",
        refreshInterval: body.refreshInterval ?? existing?.refreshInterval ?? 30,
        realtimeAlertEnabled: body.realtimeAlertEnabled ?? existing?.realtimeAlertEnabled ?? true,
        darkModeFollowSystem: body.darkModeFollowSystem ?? existing?.darkModeFollowSystem ?? false,
      };
      await setPlatformConfig(updated);
      return reply.send(updated);
    },
  );
}
