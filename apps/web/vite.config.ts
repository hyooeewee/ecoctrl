import { createDevProxy, resolveUiAlias, viteConfig } from "@ecoctrl/shared";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig, loadEnv } from "vite-plus";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiBaseUrl = env.API_BASE_URL;

  return mergeConfig(viteConfig, {
    plugins: [resolveUiAlias(), tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    optimizeDeps: {
      include: ["@ecoctrl/ui"],
    },
    server: createDevProxy(apiBaseUrl),
  });
});
