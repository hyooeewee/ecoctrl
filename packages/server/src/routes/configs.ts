import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPlatformConfig, setPlatformConfig } from "@/repositories/platformConfig";

const configSchema = z.object({
  platformName: z.string(),
  refreshInterval: z.number(),
  realtimeAlertEnabled: z.boolean(),
  darkModeFollowSystem: z.boolean(),
  smtpHost: z.string(),
  smtpPort: z.number(),
  smtpUser: z.string(),
  smtpPass: z.string(),
  smtpSecure: z.boolean(),
});

const configBodySchema = z.object({
  platformName: z.string().optional(),
  refreshInterval: z.number().optional(),
  realtimeAlertEnabled: z.boolean().optional(),
  darkModeFollowSystem: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().optional(),
});

export default async function configRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Configs"],
        summary: "Get platform config",
        response: { 200: configSchema },
      },
    },
    async (_request, reply) => {
      const config = await getPlatformConfig();
      const raw = config ?? {
        platformName: "EcoCtrl 能管平台",
        refreshInterval: 30,
        realtimeAlertEnabled: true,
        darkModeFollowSystem: false,
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: "",
        smtpSecure: false,
      };
      return reply.send({
        ...raw,
        smtpPass: raw.smtpPass ? "****" : "",
      });
    },
  );

  fastify.put(
    "/",
    {
      schema: {
        tags: ["Configs"],
        summary: "Update platform config",
        body: configBodySchema,
        response: { 200: configSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        platformName?: string;
        refreshInterval?: number;
        realtimeAlertEnabled?: boolean;
        darkModeFollowSystem?: boolean;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPass?: string;
        smtpSecure?: boolean;
      };
      const existing = await getPlatformConfig();

      const updated = {
        platformName: body.platformName ?? existing?.platformName ?? "EcoCtrl 能管平台",
        refreshInterval: body.refreshInterval ?? existing?.refreshInterval ?? 30,
        realtimeAlertEnabled: body.realtimeAlertEnabled ?? existing?.realtimeAlertEnabled ?? true,
        darkModeFollowSystem: body.darkModeFollowSystem ?? existing?.darkModeFollowSystem ?? false,
        smtpHost: body.smtpHost ?? existing?.smtpHost ?? "",
        smtpPort: body.smtpPort ?? existing?.smtpPort ?? 587,
        smtpUser: body.smtpUser ?? existing?.smtpUser ?? "",
        smtpSecure: body.smtpSecure ?? existing?.smtpSecure ?? false,
        smtpPass:
          body.smtpPass && body.smtpPass !== "****"
            ? body.smtpPass
            : existing?.smtpPass ?? "",
      };
      await setPlatformConfig(updated);
      return reply.send({
        ...updated,
        smtpPass: updated.smtpPass ? "****" : "",
      });
    },
  );
}
