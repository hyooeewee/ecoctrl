import path from "path";
import { fileURLToPath } from "url";

import { createDevProxy, viteConfig } from "@ecoctrl/shared";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig } from "vite-plus";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const backendUrl = env.VITE_API_BASE_URL;

  return mergeConfig(viteConfig, {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: createDevProxy(backendUrl),
  });
});
