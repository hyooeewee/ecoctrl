import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";

import { ensureDatabase } from "@/lib/ensureDatabase";
// import { migrateDatabase } from "@/lib/migrateDatabase";
import { getRootLogger } from "@/lib/logger";
import databasePlugin from "@/plugins/database";
import rateLimitPlugin from "@/plugins/rateLimit";
import apiRoutes from "@/routes";
import { initQueue, stopQueue } from "@/queue/pgboss";
import { triggerEngine } from "@/engine/trigger";
import { syncSmtpFromEnv } from "@/repositories/platformConfig";
import { env } from "@/lib/env";
import { ensureS3Buckets } from "@/storage";

await ensureDatabase();
await ensureS3Buckets();
// await migrateDatabase();
await syncSmtpFromEnv();

const fastify = Fastify({ loggerInstance: getRootLogger() }).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(databasePlugin);
await fastify.register(rateLimitPlugin);
await fastify.register(fastifyJwt, {
  secret: env.JWT_SECRET!,
  sign: { expiresIn: "15m" },
});

await fastify.register(cors, {
  origin: env.CORS_ORIGIN?.split(",") || true,
});
await fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
  },
});
await fastify.register(swagger, {
  transform: jsonSchemaTransform,
  openapi: {
    info: {
      title: "EcoCtrl API",
      description: "API documentation for EcoCtrl server",
      version: "1.0.0",
    },
    servers: [
      {
        url: "/",
        description: "EcoCtrl API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "1. Call POST /auth/login (or OAuth) to get an accessToken.\n" +
            "2. Token is automatically set — no manual input needed.\n" +
            "3. All locked endpoints automatically carry the `Authorization: Bearer <token>` header.",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});

const AUTO_AUTH_JS = `(function() {
  const LS_KEY_ACCESS = 'swagger_auto_access_token';
  const LS_KEY_REFRESH = 'swagger_auto_refresh_token';

  function setAuth(token) {
    const interval = setInterval(() => {
      const ui = window._swaggerUI;
      if (ui && ui.authActions) {
        clearInterval(interval);
        ui.authActions.authorize({
          bearerAuth: {
            name: 'bearerAuth',
            schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            value: token
          }
        });
      }
    }, 300);
  }

  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const req = args[0];
    const url = typeof req === 'string' ? req : req.url;

    // Auto-fill refreshToken body before sending
    if (url && url.includes('/auth/refresh')) {
      const storedRefresh = localStorage.getItem(LS_KEY_REFRESH);
      if (storedRefresh) {
        try {
          const opts = args[1] || {};
          let bodyObj = JSON.parse(opts.body || '{}');
          if (!bodyObj.refreshToken || bodyObj.refreshToken === 'auto-filled after login') {
            bodyObj.refreshToken = storedRefresh;
            args[1] = { ...opts, body: JSON.stringify(bodyObj) };
          }
        } catch(e) {}
      }
    }

    return originalFetch.apply(this, args).then(response => {
      // Handle login response
      if (url && url.includes('/auth/login')) {
        response.clone().json().then(data => {
          const accessToken = data.accessToken;
          const refreshToken = data.refreshToken;
          if (accessToken) {
            localStorage.setItem(LS_KEY_ACCESS, accessToken);
            setAuth(accessToken);
          }
          if (refreshToken) {
            localStorage.setItem(LS_KEY_REFRESH, refreshToken);
          }
        }).catch(() => {});
      }
      // Handle refresh response
      if (url && url.includes('/auth/refresh')) {
        response.clone().json().then(data => {
          const accessToken = data.accessToken;
          const refreshToken = data.refreshToken;
          if (accessToken) {
            localStorage.setItem(LS_KEY_ACCESS, accessToken);
            setAuth(accessToken);
          }
          if (refreshToken) {
            localStorage.setItem(LS_KEY_REFRESH, refreshToken);
          }
        }).catch(() => {});
      }
      return response;
    });
  };

  const originalBundle = window.SwaggerUIBundle;
  window.SwaggerUIBundle = function(config) {
    const ui = originalBundle(config);
    window._swaggerUI = ui;
    // Restore previous token on page load
    const savedToken = localStorage.getItem(LS_KEY_ACCESS);
    if (savedToken) setAuth(savedToken);
    return ui;
  };
  Object.setPrototypeOf(window.SwaggerUIBundle, originalBundle);
  Object.keys(originalBundle).forEach(function(k) { window.SwaggerUIBundle[k] = originalBundle[k]; });
})();`;

await fastify.register(swaggerUi, {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
    persistAuthorization: true,
  },
  theme: {
    js: [{ filename: "auto-auth.js", content: AUTO_AUTH_JS }],
  },
});

await fastify.register(
  async (fastify) => {
    fastify.get("/", async (_request, _reply) => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });
  },
  { prefix: "/health" },
);
await fastify.register(apiRoutes, { prefix: "/api" });

// Initialize pg-boss queue and sync schedule triggers
await initQueue();
await triggerEngine.syncSchedules();

const PORT = Number(env.PORT) || 3000;
const HOST = env.HOST || "0.0.0.0";

try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Server listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  await stopQueue();
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
