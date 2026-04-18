import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";

import fileRoutes from "./src/routes/files.js";
import maintenanceRoutes from "./src/routes/maintenance.js";
import faultRoutes from "./src/routes/faults.js";
import configRoutes from "./src/routes/config.js";
import threeDConfigRoutes from "./src/routes/threeDConfig.js";
import energyRoutes from "./src/routes/energy.js";
import reportRoutes from "./src/routes/reports.js";
import accountRoutes from "./src/routes/accounts.js";
import dashboardRoutes from "./src/routes/dashboard.js";
import alertRoutes from "./src/routes/alerts.js";
import modelRoutes from "./src/routes/models.js";

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
await fastify.register(faultRoutes, { prefix: "/api/faults" });
await fastify.register(configRoutes, { prefix: "/api/config" });
await fastify.register(threeDConfigRoutes, { prefix: "/api/three-d-config" });
await fastify.register(energyRoutes, { prefix: "/api/energy" });
await fastify.register(reportRoutes, { prefix: "/api/reports" });
await fastify.register(accountRoutes, { prefix: "/api/users" });
await fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });
await fastify.register(alertRoutes, { prefix: "/api/alerts" });
await fastify.register(modelRoutes, { prefix: "/api/models" });

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
