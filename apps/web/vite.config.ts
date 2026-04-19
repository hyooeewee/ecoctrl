import { viteConfig } from "@ecoctrl/shared";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig, loadEnv } from "vite-plus";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiBaseUrl = env.VITE_API_BASE_URL;

  const proxy =
    apiBaseUrl && /^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(apiBaseUrl)
      ? {
          "/api": {
            target: apiBaseUrl,
            changeOrigin: true,
          },
        }
      : undefined;

  return mergeConfig(viteConfig, {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: proxy ? { proxy } : undefined,
  });
});
