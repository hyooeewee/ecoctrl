import path from "path";
import { fileURLToPath } from "url";

import { createDevProxy, resolveUiAlias, viteConfig } from "@ecoctrl/shared/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig } from "vite-plus";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  const apiProxy = createDevProxy(env.API_BASE_URL, {
    apiPrefix: env.API_PREFIX,
    staticPrefix: env.STATIC_PREFIX,
  });

  return mergeConfig(viteConfig, {
    plugins: [resolveUiAlias(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "zod/v4/core": path.resolve(__dirname, "node_modules/zod/v4/core/index.js"),
        "zod/v3": path.resolve(__dirname, "node_modules/zod/v3/index.js"),
      },
    },
    optimizeDeps: {
      include: ["@rjsf/core", "@rjsf/validator-ajv8"],
    },
    server: {
      ...apiProxy,
      proxy: {
        ...apiProxy?.proxy,
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
