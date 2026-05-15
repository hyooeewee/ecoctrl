import { createDevProxy, resolveUiAlias, viteConfig } from "@ecoctrl/shared/vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig, loadEnv } from "vite-plus";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return mergeConfig(viteConfig, {
    plugins: [resolveUiAlias(), tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: createDevProxy(env.API_BASE_URL, {
      apiPrefix: env.API_PREFIX,
      staticPrefix: env.STATIC_PREFIX,
    }),
    test: {
      environment: "jsdom",
      globals: true,
      include: ["__tests__/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
      setupFiles: ["./__tests__/setup.ts"],
      coverage: {
        reporter: ["text", "json", "html"],
        exclude: ["node_modules/", "__tests__/"],
      },
    },
  });
});
