import path from "path";
import { fileURLToPath } from "url";

import { viteConfig } from "@ecoctrl/shared";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig } from "vite-plus";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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

  return mergeConfig(viteConfig, {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: proxy ? { proxy } : undefined,
  });
});
