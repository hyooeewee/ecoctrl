import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDevProxy, resolveUiAlias, viteConfig } from "@ecoctrl/shared/vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig, loadEnv } from "vite-plus";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VIRTUAL_MODULE_ID = "virtual:pets";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

function scanPets(petsDir: string) {
  if (!fs.existsSync(petsDir)) return [];

  const entries = [];
  const dirs = fs
    .readdirSync(petsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const petJsonPath = path.join(petsDir, dir, "pet.json");
    if (!fs.existsSync(petJsonPath)) continue;

    const raw = fs.readFileSync(petJsonPath, "utf-8");
    const petJson = JSON.parse(raw);

    entries.push({
      id: petJson.id,
      displayName: petJson.displayName,
      spritesheetPath: `/assets/pets/${dir}/spritesheet.webp`,
      cellWidth: 192,
      cellHeight: 208,
      cols: 8,
      rows: 9,
    });
  }

  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function petsPlugin(): any {
  return {
    name: "ecoctrl-pets",
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
      return null;
    },
    load(id: string) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return null;

      const petsDir = path.resolve(__dirname, "public/assets/pets");
      const entries = scanPets(petsDir);

      return `export const spritePetRegistry = ${JSON.stringify({ pets: entries })};\n`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return mergeConfig(viteConfig, {
    plugins: [petsPlugin(), resolveUiAlias(), tailwindcss(), reactRouter()],
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
