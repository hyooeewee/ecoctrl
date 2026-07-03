import { defineConfig } from "rolldown";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { writeFile, readFile, cp } from "node:fs/promises";
import pkg from "./package.json" with { type: "json" };

const staticAssets = [".env.example"];

export default defineConfig({
  input: ["index.ts", "src/queue/worker.ts", "scripts/init.ts", "scripts/seed.ts"],

  output: {
    dir: "dist",
    format: "esm",
    sourcemap: false,
    entryFileNames: "[name].mjs",
  },

  platform: "node",

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },

  external: (id) => {
    if (id.startsWith("node:")) return true;
    if (id.startsWith(".") || path.isAbsolute(id) || id.startsWith("@/")) return false;
    if (id.startsWith("@ecoctrl/")) return false;
    return true;
  },

  plugins: [
    {
      name: "emit-pre-build",
      buildStart() {
        // Generate .env.example
        const scriptPath = path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../shared/scripts/gen-env-example.ts",
        );
        const result = spawnSync("tsx", [scriptPath, "-y"], { stdio: "inherit" });
        if (result.status !== 0) {
          this.warn(`gen-env-example exited with code ${result.status ?? result.signal}`);
        }
        // Generate drizzle migration
        spawnSync("pnpm", ["run", "db:generate"], { stdio: "inherit" });
      },
    },
    {
      name: "emit-static-files",
      async generateBundle() {
        // eslint-disable-next-line no-await-in-loop
        for (const file of staticAssets) {
          // oxlint-disable-next-line no-await-in-loop
          const source = await readFile(file);
          this.emitFile({ type: "asset", fileName: file, source });
        }
      },
    },
    {
      name: "emit-static-assets",
      async writeBundle() {
        await cp("assets/", "dist/", { recursive: true });
        await cp("drizzle/", "dist/drizzle/", { recursive: true });
      },
    },
    {
      name: "emit-runtime-pkg",
      async writeBundle(_opts, bundle) {
        // 扫出 bundle 实际 external 的包（去掉子路径，合并 scope）
        const externals = new Set<string>();
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== "chunk") continue;
          for (const imp of chunk.imports) {
            if (imp.startsWith("node:")) continue;
            const name = imp.startsWith("@")
              ? imp.split("/").slice(0, 2).join("/")
              : imp.split("/")[0];
            externals.add(name);
          }
        }

        // 用源 package.json 的版本号回填
        const sourceDeps = pkg.dependencies as Record<string, string>;
        const deps: Record<string, string> = {};
        for (const name of [...externals].toSorted()) {
          const v = sourceDeps[name];
          if (v) deps[name] = v;
          else this.warn(`no version found for "${name}" in package.json`);
        }

        const runtimePkg = {
          name: pkg.name,
          version: pkg.version,
          private: true,
          type: "module",
          dependencies: deps,
        };
        await writeFile("dist/package.json", JSON.stringify(runtimePkg, null, 2) + "\n");
      },
    },
  ],
});
