import { shared } from "@ecoctrl/config/shared";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig, loadEnv } from "vite-plus";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const backendUrl = env.BACKEND_URL;

  const proxy =
    backendUrl && /^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(backendUrl)
      ? {
          "/api": {
            target: backendUrl,
            changeOrigin: true,
          },
        }
      : undefined;
  return mergeConfig(shared, {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: proxy ? { proxy } : undefined,
  });
});
