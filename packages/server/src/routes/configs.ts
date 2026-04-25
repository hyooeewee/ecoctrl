import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findPlatformConfig, updatePlatformConfig } from "@/repositories/platformConfig";

const configSchema = z.object({
  platformName: z.string(),
  refreshInterval: z.number(),
  realtimeAlertEnabled: z.boolean(),
  timezone: z.string(),
  autoBackup: z.boolean(),
  backupRetentionDays: z.number(),
  sessionTimeout: z.number(),
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
  timezone: z.string().optional(),
  autoBackup: z.boolean().optional(),
  backupRetentionDays: z.number().optional(),
  sessionTimeout: z.number().optional(),
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
      const config = await findPlatformConfig();
      return reply.send({
        ...config,
        smtpPass: config.smtpPass ? "****" : "",
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
        timezone?: string;
        autoBackup?: boolean;
        backupRetentionDays?: number;
        sessionTimeout?: number;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPass?: string;
        smtpSecure?: boolean;
      };
      const existing = await findPlatformConfig();

      const updated = {
        platformName: body.platformName ?? existing.platformName,
        refreshInterval: body.refreshInterval ?? existing.refreshInterval,
        realtimeAlertEnabled: body.realtimeAlertEnabled ?? existing.realtimeAlertEnabled,
        timezone: body.timezone ?? existing.timezone,
        autoBackup: body.autoBackup ?? existing.autoBackup,
        backupRetentionDays: body.backupRetentionDays ?? existing.backupRetentionDays,
        sessionTimeout: body.sessionTimeout ?? existing.sessionTimeout,
        smtpHost: body.smtpHost ?? existing.smtpHost,
        smtpPort: body.smtpPort ?? existing.smtpPort,
        smtpUser: body.smtpUser ?? existing.smtpUser,
        smtpSecure: body.smtpSecure ?? existing.smtpSecure,
        smtpPass:
          body.smtpPass && body.smtpPass !== "****"
            ? body.smtpPass
            : existing.smtpPass,
      };
      await updatePlatformConfig(updated);
      return reply.send({
        ...updated,
        smtpPass: updated.smtpPass ? "****" : "",
      });
    },
  );
}
