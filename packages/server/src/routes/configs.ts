import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findPlatformConfig, updatePlatformConfig } from "@/repositories/platformConfig";
import { findUserById } from "@/repositories/users";
import { sendMail } from "@/lib/mailer";

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
  allowRegistration: z.boolean(),
  allowPasswordReset: z.boolean(),
  allowOAuthLogin: z.boolean(),
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
  allowRegistration: z.boolean().optional(),
  allowPasswordReset: z.boolean().optional(),
  allowOAuthLogin: z.boolean().optional(),
});

const testEmailBodySchema = z.object({
  to: z.string().email(),
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
      const payload = request.user as { userId: string } | undefined;
      const user = payload?.userId ? await findUserById(payload.userId) : null;
      if (user?.role !== "super_admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

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
        allowRegistration?: boolean;
        allowPasswordReset?: boolean;
        allowOAuthLogin?: boolean;
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
        smtpPass: body.smtpPass && body.smtpPass !== "****" ? body.smtpPass : existing.smtpPass,
        allowRegistration: body.allowRegistration ?? existing.allowRegistration,
        allowPasswordReset: body.allowPasswordReset ?? existing.allowPasswordReset,
        allowOAuthLogin: body.allowOAuthLogin ?? existing.allowOAuthLogin,
      };
      await updatePlatformConfig(updated);
      return reply.send({
        ...updated,
        smtpPass: updated.smtpPass ? "****" : "",
      });
    },
  );

  fastify.post(
    "/test-email",
    {
      schema: {
        tags: ["Configs"],
        summary: "Send test email",
        body: testEmailBodySchema,
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const payload = request.user as { userId: string } | undefined;
      const user = payload?.userId ? await findUserById(payload.userId) : null;
      if (user?.role !== "super_admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const body = request.body as { to: string };
      try {
        await sendMail({
          to: body.to,
          subject: "EcoCtrl SMTP 测试邮件",
          text: "这是一封来自 EcoCtrl 平台的 SMTP 测试邮件。如果您收到此邮件，说明邮件服务器配置正确。",
          html: "<p>这是一封来自 <strong>EcoCtrl</strong> 平台的 SMTP 测试邮件。</p><p>如果您收到此邮件，说明邮件服务器配置正确。</p>",
        });
        return reply.send({ success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "发送失败";
        return reply.status(500).send({ error: message });
      }
    },
  );
}
