import path from "path";
import { fileURLToPath } from "url";

import { createDevProxy, resolveUiAlias, viteConfig } from "@ecoctrl/shared/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig } from "vite-plus";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return mergeConfig(viteConfig, {
    envPrefix: "ADVANCED_",
    plugins: [resolveUiAlias(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    optimizeDeps: {
      include: ["@rjsf/core", "@rjsf/validator-ajv8"],
    },
    server: createDevProxy(env.API_BASE_URL, {
      apiPrefix: env.API_PREFIX,
      staticPrefix: env.STATIC_PREFIX,
    }),
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
