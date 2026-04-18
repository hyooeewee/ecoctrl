import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";

import fileRoutes from "./src/routes/files.js";
import maintenanceRoutes from "./src/routes/maintenance.js";

const fastify = Fastify({ logger: true });

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

await fastify.register(fileRoutes, { prefix: "/api/files" });
await fastify.register(maintenanceRoutes, { prefix: "/api/maintenance" });

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

try {
  await fastify.listen({ port: 3000, host: "0.0.0.0" });
  console.log("Server listening on http://localhost:3000");
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
