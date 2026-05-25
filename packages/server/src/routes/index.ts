import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { findPlatformConfig } from "@/repositories/platformConfig";
import { findDashboardData } from "@/repositories/dashboard";
import { findOnlineUser } from "@/repositories/users";
import { findDashboardModel } from "@/repositories/dashboardModel";
import fileRoutes from "@/routes/files";
import maintenanceRoutes from "@/routes/maintenance";
import faultRoutes from "@/routes/faults";
import configsRoutes from "@/routes/configs";
import dashboardModelRoutes from "@/routes/dashboardModel";
import energyRoutes from "@/routes/energy";
import reportRoutes from "@/routes/reports";
import userRoutes from "@/routes/users";
import overviewRoutes from "@/routes/overview";
import alertRoutes from "@/routes/alerts";
import settingsRoutes from "@/routes/settings";
import userSettingsRoutes from "@/routes/userSettings";
import modelRoutes from "@/routes/models";
import objectRoutes from "@/routes/objects";
import pointRoutes from "@/routes/points";
import { getModelStorage } from "@/storage";
import iotRoutes from "@/routes/iot";
import backupScheduleRoutes from "@/routes/backupSchedule";
import authRoutes from "@/routes/auth";
import oauthRoutes from "@/routes/oauth";
import workflowRoutes, { registerWebhookRoute } from "@/routes/workflows";
import aiRoutes from "@/routes/ai";
import nodeRoutes from "@/routes/nodes";
import petRoutes from "@/routes/pets";
import eventsRoutes from "@/routes/events";
import { PluginRegistry } from "@/engine/plugin-registry";
import { getPluginStorage } from "@/storage";

export default async function apiRoutes(fastify: FastifyInstance) {
  // Initialize plugin registry with storage adapter (minio or local)
  const pluginStorage = getPluginStorage();
  const registry = new PluginRegistry(pluginStorage);
  await registry.loadAll();

  // Decorate fastify instance so routes can access registry
  fastify.decorate("pluginRegistry", registry);

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const publicPaths = [
      "/health",
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/register/send-code",
      "/api/auth/refresh",
      "/api/auth/forgot-password/send-code",
      "/api/auth/forgot-password/reset",
      "/api/auth/oauth/providers",
      "/api/auth/oauth/wechat/authorize",
      "/api/auth/oauth/wechat/callback",
      "/api/auth/oauth/feishu/authorize",
      "/api/auth/oauth/feishu/callback",
      "/api/auth/oauth/bind",
      "/api/auth/oauth/register-and-bind",
      "/api/public",
      "/api/webhook",
      "/api/ai/chat",
      "/api/pets",
      "/api/events", // SSE stream uses query token auth, not Bearer header
    ];
    if (publicPaths.some((p) => request.url.startsWith(p))) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  fastify.get(
    "/public/config",
    {
      config: { rateLimit: { max: 200, timeWindow: "1 minute" } },
      schema: { tags: ["Public"], summary: "Get public platform config", security: [] },
    },
    async (_request, reply) => {
      const config = await findPlatformConfig();
      return reply.send({
        platformName: config.platformName,
        allowRegistration: config.allowRegistration,
        allowPasswordReset: config.allowPasswordReset,
        allowOAuthLogin: config.allowOAuthLogin,
      });
    },
  );

  fastify.get(
    "/public/dashboard",
    {
      config: { rateLimit: { max: 200, timeWindow: "1 minute" } },
      schema: { tags: ["Public"], summary: "Get public dashboard data", security: [] },
    },
    async (_request, reply) => {
      const user = await findOnlineUser();
      const data = await findDashboardData(user?.id);
      return reply.send(data);
    },
  );

  const modelStorage = getModelStorage();

  fastify.get(
    "/public/model",
    {
      config: { rateLimit: { max: 200, timeWindow: "1 minute" } },
      schema: {
        tags: ["Public"],
        summary: "Get dashboard model config",
        security: [],
      },
    },
    async (_request, reply) => {
      const config = await findDashboardModel();
      const result = config ?? {
        modelFileUrl: null,
        cameraPreset: "Default_View_01",
        ambientLightIntensity: 0.85,
        hotspots: [],
        labels: [],
      };
      if (result.modelFileUrl) {
        result.modelFileUrl = await modelStorage.getUrl(result.modelFileUrl);
      }
      return reply.send(result);
    },
  );

  await fastify.register(fileRoutes, { prefix: "/files" });
  await fastify.register(maintenanceRoutes, { prefix: "/maintenance" });
  await fastify.register(faultRoutes, { prefix: "/faults" });
  await fastify.register(configsRoutes, { prefix: "/configs" });
  await fastify.register(dashboardModelRoutes, { prefix: "/dashboard-model" });
  await fastify.register(energyRoutes, { prefix: "/energy" });
  await fastify.register(reportRoutes, { prefix: "/reports" });
  await fastify.register(userRoutes, { prefix: "/users" });
  await fastify.register(overviewRoutes, { prefix: "/overview" });
  await fastify.register(alertRoutes, { prefix: "/alerts" });
  await fastify.register(settingsRoutes, { prefix: "/public/settings" });
  await fastify.register(userSettingsRoutes, { prefix: "/settings" });
  await fastify.register(objectRoutes, { prefix: "/objects" });
  await fastify.register(pointRoutes, { prefix: "/points" });
  await fastify.register(iotRoutes, { prefix: "/iot" });
  await fastify.register(modelRoutes, { prefix: "/models" });
  await fastify.register(backupScheduleRoutes, { prefix: "/system" });
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(oauthRoutes, { prefix: "/auth/oauth" });
  await fastify.register(workflowRoutes, { prefix: "/workflows" });
  await fastify.register(aiRoutes, { prefix: "/ai" });
  await fastify.register(nodeRoutes, { prefix: "/nodes", registry });
  await fastify.register(petRoutes, { prefix: "/pets" });
  await fastify.register(eventsRoutes, { prefix: "/events" });
  await registerWebhookRoute(fastify);
}
