import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import path from "node:path";

import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from "fastify-type-provider-zod";

import { ensureDatabase } from "@/lib/ensureDatabase";
import { UPLOAD_DIR } from "@/lib/paths";
import databasePlugin from "@/plugins/database";
import apiRoutes from "@/routes";
import { syncSmtpFromEnv } from "@/repositories/platformConfig";

await ensureDatabase();
await syncSmtpFromEnv();

const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(databasePlugin);
await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
  sign: { expiresIn: "15m" },
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || true,
});
await fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
  },
});
await fastify.register(fastifyStatic, {
  root: path.join(UPLOAD_DIR, "models"),
  prefix: "/uploads/models/",
});
await fastify.register(fastifyStatic, {
  root: path.join(UPLOAD_DIR, "files"),
  prefix: "/uploads/files/",
  decorateReply: false,
});
await fastify.register(fastifyStatic, {
  root: path.join(UPLOAD_DIR, "avatar"),
  prefix: "/uploads/avatar/",
  decorateReply: false,
});
await fastify.register(swagger, {
  openapi: {
    info: {
      title: "EcoCtrl API",
      description: "API documentation for EcoCtrl server",
      version: "1.0.0",
    },
    servers: [
      {
        url: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
        description: "EcoCtrl API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: "/documentation",
});

await fastify.register(apiRoutes, { prefix: "/api" });

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`Server listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
