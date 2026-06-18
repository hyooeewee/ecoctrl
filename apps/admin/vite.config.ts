import path from "path";
import { fileURLToPath } from "url";

import { createDevProxy, resolveUiAlias, viteConfig } from "@ecoctrl/shared/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig } from "vite-plus";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ========================================
// WebTalk image placeholder
// ========================================
//
// WebTalk's com_index.php requests ../../_images/ with no filename, which
// returns 403 from the upstream Apache server. This placeholder keeps the
// browser console clean by serving a 1x1 transparent PNG for that directory
// request before it reaches the proxy.

function webtalkPlaceholderPlugin() {
  const transparentPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );

  return {
    name: "webtalk-image-placeholder",
    configureServer(server: {
      middlewares: {
        use: (
          path: string,
          handler: (
            req: { url?: string },
            res: {
              setHeader: (k: string, v: string) => void;
              statusCode: number;
              end: (data: Buffer) => void;
            },
            next: () => void,
          ) => void,
        ) => void;
      };
    }) {
      server.middlewares.use("/webtalk/_images", (req, res, next) => {
        const url = req.url ?? "/";
        if (url === "/" || url.endsWith("/")) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.statusCode = 200;
          res.end(transparentPng);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  const apiProxy = createDevProxy(env.API_BASE_URL, {
    apiPrefix: env.API_PREFIX,
    staticPrefix: env.STATIC_PREFIX,
  });

  const advancedUrl = env.ADVANCED_MANAGEMENT_URL || "http://localhost:5001/";
  // Proxy to the WebTalk host root. The incoming /webtalk/... path is rewritten
  // to /_webtalk/... so http-proxy does not append the client path to the
  // target path twice.
  const webtalkHost = new URL("/", advancedUrl).href;
  const webtalkPrefix = new URL("_webtalk/", advancedUrl).pathname;

  return mergeConfig(viteConfig, {
    envPrefix: "ADVANCED_",
    plugins: [resolveUiAlias(), react(), tailwindcss(), webtalkPlaceholderPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    optimizeDeps: {
      include: ["@rjsf/core", "@rjsf/validator-ajv8"],
    },
    server: {
      ...apiProxy,
      proxy: {
        ...apiProxy?.proxy,
        "/webtalk": {
          target: webtalkHost,
          changeOrigin: true,
          selfHandleResponse: true,
          rewrite: (path) => webtalkPrefix + path.replace(/^\/webtalk\/?/, ""),
          configure: (proxy) => {
            // Remove the popup <script> from the login response so the iframe
            // only performs the meta-refresh to runframe.php.
            (proxy as { on: (event: string, handler: (...args: any[]) => void) => void }).on(
              "proxyRes",
              (proxyRes, req, res) => {
                if (!req.url?.includes("loginA.php")) {
                  res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, proxyRes.headers);
                  proxyRes.pipe(res);
                  return;
                }

                let body = "";
                proxyRes.setEncoding("utf8");
                proxyRes.on("data", (chunk: string) => {
                  body += chunk;
                });
                proxyRes.on("end", () => {
                  const modified = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
                  res.statusCode = proxyRes.statusCode;

                  // Forward upstream headers (especially Set-Cookie) while
                  // overriding the body-related ones we are about to rewrite.
                  for (const [key, value] of Object.entries(proxyRes.headers)) {
                    if (value === undefined) continue;
                    const lower = key.toLowerCase();
                    if (lower === "content-type" || lower === "content-length") continue;
                    try {
                      res.setHeader(key, value);
                    } catch {
                      // Ignore invalid header names/values.
                    }
                  }

                  res.setHeader("Content-Type", "text/html; charset=UTF-8");
                  res.setHeader("Content-Length", Buffer.byteLength(modified));
                  res.end(modified);
                });
              },
            );
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      include: ["__tests__/**/*.test.{ts,tsx}"],
      setupFiles: ["./__tests__/setup.ts"],
      coverage: {
        reporter: ["text", "json", "html"],
        exclude: ["node_modules/", "__tests__/"],
      },
    },
  });
});
