import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import fileRoutes from "@/routes/files";
import maintenanceRoutes from "@/routes/maintenance";
import faultRoutes from "@/routes/faults";
import configRoutes from "@/routes/config";
import threeDConfigRoutes from "@/routes/threeDConfig";
import energyRoutes from "@/routes/energy";
import reportRoutes from "@/routes/reports";
import accountRoutes from "@/routes/accounts";
import dashboardRoutes from "@/routes/dashboard";
import overviewRoutes from "@/routes/overview";
import alertRoutes from "@/routes/alerts";
import settingsRoutes from "@/routes/settings";
import modelRoutes from "@/routes/models";
import iotRoutes from "@/routes/iot";
import systemRoutes from "@/routes/system";
import authRoutes from "@/routes/auth";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const publicPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/dashboard"];
    if (publicPaths.some((p) => request.url.startsWith(p))) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  await fastify.register(fileRoutes, { prefix: "/files" });
  await fastify.register(maintenanceRoutes, { prefix: "/maintenance" });
  await fastify.register(faultRoutes, { prefix: "/faults" });
  await fastify.register(configRoutes, { prefix: "/config" });
  await fastify.register(threeDConfigRoutes, { prefix: "/three-d-config" });
  await fastify.register(energyRoutes, { prefix: "/energy" });
  await fastify.register(reportRoutes, { prefix: "/reports" });
  await fastify.register(accountRoutes, { prefix: "/users" });
  await fastify.register(dashboardRoutes, { prefix: "/dashboard" });
  await fastify.register(overviewRoutes, { prefix: "/overview" });
  await fastify.register(alertRoutes, { prefix: "/alerts" });
  await fastify.register(settingsRoutes, { prefix: "/dashboard/settings" });
  await fastify.register(iotRoutes, { prefix: "/iot" });
  await fastify.register(modelRoutes, { prefix: "/models" });
  await fastify.register(systemRoutes, { prefix: "/system" });
  await fastify.register(authRoutes, { prefix: "/auth" });
}
