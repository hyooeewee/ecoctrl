import path from "path";
import { fileURLToPath } from "url";

import { shared } from "@ecoctrl/config/shared";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vite-plus";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(
  mergeConfig(shared, {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@ui": path.resolve(__dirname, "src/components/ui"),
      },
    },
  }),
);
