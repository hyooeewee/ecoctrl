import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import fileRoutes from "@/routes/files";
import maintenanceRoutes from "@/routes/maintenance";
import faultRoutes from "@/routes/faults";
import configsRoutes from "@/routes/configs";
import threeDConfigRoutes from "@/routes/threeDConfig";
import energyRoutes from "@/routes/energy";
import reportRoutes from "@/routes/reports";
import userRoutes from "@/routes/users";
import dashboardRoutes from "@/routes/dashboard";
import overviewRoutes from "@/routes/overview";
import alertRoutes from "@/routes/alerts";
import settingsRoutes from "@/routes/settings";
import modelRoutes from "@/routes/models";
import iotRoutes from "@/routes/iot";
import backupScheduleRoutes from "@/routes/backupSchedule";
import authRoutes from "@/routes/auth";
import oauthRoutes from "@/routes/oauth";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const publicPaths = [
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
      "/api/dashboard",
    ];
    if (publicPaths.some((p) => request.url.startsWith(p))) return;
    // Avatar file requests cannot carry Authorization headers from <img> tags
    if (/^\/api\/users\/[^\/]+\/avatar/.test(request.url)) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  await fastify.register(fileRoutes, { prefix: "/files" });
  await fastify.register(maintenanceRoutes, { prefix: "/maintenance" });
  await fastify.register(faultRoutes, { prefix: "/faults" });
  await fastify.register(configsRoutes, { prefix: "/configs" });
  await fastify.register(threeDConfigRoutes, { prefix: "/three-d-config" });
  await fastify.register(energyRoutes, { prefix: "/energy" });
  await fastify.register(reportRoutes, { prefix: "/reports" });
  await fastify.register(userRoutes, { prefix: "/users" });
  await fastify.register(dashboardRoutes, { prefix: "/dashboard" });
  await fastify.register(overviewRoutes, { prefix: "/overview" });
  await fastify.register(alertRoutes, { prefix: "/alerts" });
  await fastify.register(settingsRoutes, { prefix: "/dashboard/settings" });
  await fastify.register(iotRoutes, { prefix: "/iot" });
  await fastify.register(modelRoutes, { prefix: "/models" });
  await fastify.register(backupScheduleRoutes, { prefix: "/system" });
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(oauthRoutes, { prefix: "/auth/oauth" });
}
