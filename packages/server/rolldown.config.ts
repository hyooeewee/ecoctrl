import { defineConfig } from "rolldown";
import path from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import pkg from "./package.json" with { type: "json" };

const staticAssets = ["ecoctrl.config.cjs", ".env.example"];

export default defineConfig({
  input: "index.ts",

  output: {
    file: "dist/index.mjs",
    format: "esm",
    sourcemap: false,
  },

  platform: "node",

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },

  // 所有 bare specifier 都视为外部，不再手维护清单
  // 等价于 esbuild 的 --packages=external
  external: (id) => {
    if (id.startsWith("node:")) return true;
    if (id.startsWith(".") || path.isAbsolute(id) || id.startsWith("@/")) return false;
    if (id.startsWith("@ecoctrl/")) return false;
    return true;
  },

  plugins: [
    {
      name: "emit-static-assets",
      async generateBundle() {
        for (const file of staticAssets) {
          const source = await readFile(file);
          this.emitFile({ type: "asset", fileName: file, source });
        }
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
