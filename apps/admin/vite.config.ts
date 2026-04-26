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
    plugins: [resolveUiAlias(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: createDevProxy(env.API_BASE_URL, {
      apiPrefix: env.API_PREFIX,
      staticPrefix: env.STATIC_PREFIX,
    }),
  });
});
