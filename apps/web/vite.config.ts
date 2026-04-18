import { shared } from "@ecoctrl/config/shared";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig } from "vite-plus";

export default defineConfig(
  mergeConfig(shared, {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
  }),
);
