import path from "path";
import { createRequire } from "module";
import type { UserConfig, Plugin } from "vite-plus";

export interface DevProxyOptions {
  extraPaths?: string[];
}

export function resolveUiAlias(): Plugin {
  const require = createRequire(import.meta.url);
  const uiPkgPath = require.resolve("@ecoctrl/ui/package.json");
  const uiSrc = path.resolve(path.dirname(uiPkgPath), "src");
  return {
    name: "resolve-ui-alias",
    enforce: "pre",
    resolveId(id: string, importer: string | undefined) {
      if (!id.startsWith("@/") || !importer) return;
      if (importer.includes("@ecoctrl/ui") || importer.includes("packages/ui")) {
        return path.resolve(uiSrc, id.slice(2));
      }
    },
  };
}

export function createDevProxy(
  apiBaseUrl: string | undefined,
  options: DevProxyOptions = {},
): UserConfig["server"] | undefined {
  if (!apiBaseUrl || !/^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(apiBaseUrl)) {
    return undefined;
  }

  const proxy: Record<string, { target: string; changeOrigin: true }> = {
    "/api": { target: apiBaseUrl, changeOrigin: true },
    "/static": { target: apiBaseUrl, changeOrigin: true },
  };

  for (const path of options.extraPaths ?? []) {
    proxy[path] = { target: apiBaseUrl, changeOrigin: true };
  }

  return { proxy };
}

export const viteConfig = {
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["dist/**", "build/**", "node_modules/**", "**/components/ui/**", ".claude/**"],
    sortImports: true,
    sortTailwindcss: {
      functions: ["cn", "cva", "clsx"],
    },
  },
  lint: {
    ignorePatterns: ["dist/**", "build/**", "node_modules/**", "**/components/ui/**", ".claude/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "no-unused-vars": "error",
    },
  },
} satisfies UserConfig;
