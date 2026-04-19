import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";

import { ensureDatabase } from "@/lib/ensureDatabase";
import databasePlugin from "@/plugins/database";
import apiRoutes from "@/routes/api";

await ensureDatabase();

const fastify = Fastify({ logger: true });

await fastify.register(databasePlugin);
await fastify.register(cors, { origin: true });
await fastify.register(multipart, { attachFieldsToBody: false });

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "EcoCtrl API",
      description: "API documentation for EcoCtrl server",
      version: "1.0.0",
    },
  },
});

await fastify.register(apiRoutes, { prefix: "/api" });

fastify.get("/documentation/json", async () => fastify.swagger());

fastify.get("/documentation", async (_request, reply) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EcoCtrl API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/documentation/json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`;
  return reply.type("text/html").send(html);
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`Server listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
