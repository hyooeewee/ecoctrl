import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { UserConfig, Plugin } from "vite-plus";

export interface DevProxyOptions {
  /** Real backend prefix the client's `/api` should be rewritten to. Defaults to `/api`. */
  apiPrefix?: string;
  /** Real backend prefix the client's `/static` should be rewritten to. Defaults to `/static`. */
  staticPrefix?: string;
  /** Extra exact-match paths to forward to the same backend without rewrite. */
  extraPaths?: string[];
}

export function resolveUiAlias(): Plugin {
  const uiPkgPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../ui/package.json",
  );
  const uiSrc = path.resolve(path.dirname(uiPkgPath), "src");
  // rolldown's prod build won't probe extensions for absolute paths returned
  // by a plugin, so we resolve them ourselves.
  const exts = [".tsx", ".ts", ".jsx", ".js"];
  const findExisting = (base: string): string | undefined => {
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
    for (const ext of exts) {
      const candidate = base + ext;
      if (fs.existsSync(candidate)) return candidate;
    }
    for (const ext of exts) {
      const candidate = path.join(base, "index" + ext);
      if (fs.existsSync(candidate)) return candidate;
    }
  };
  return {
    name: "resolve-ui-alias",
    enforce: "pre",
    resolveId(id: string, importer: string | undefined) {
      if (!importer) return;
      if (!importer.includes("@ecoctrl/ui") && !importer.includes("packages/ui")) return;

      // Case 1: a still-bare "@/foo" import from inside the ui package.
      if (id.startsWith("@/")) return findExisting(path.resolve(uiSrc, id.slice(2)));

      // Case 2: a consumer's resolve.alias (e.g. apps/admin/vite.config.ts) has
      // already rewritten "@/foo" to their own /src/foo absolute path before our
      // plugin sees it. Redirect back into the ui src tree.
      if (path.isAbsolute(id) && !id.startsWith(uiSrc)) {
        const m = id.match(/[\\/]src[\\/](.+)$/);
        if (m) return findExisting(path.resolve(uiSrc, m[1]));
      }
    },
  };
}

export function createDevProxy(
  apiBaseUrl: string | undefined,
  options: DevProxyOptions = {},
): UserConfig["server"] | undefined {
  // Work around Node.js internalConnectMultiple error by using IPv4 directly
  const targetUrl = apiBaseUrl?.replace("localhost", "127.0.0.1");
  if (!targetUrl || !/^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(targetUrl)) {
    return undefined;
  }

  const apiPrefix = options.apiPrefix?.trim() || "/api";
  const staticPrefix = options.staticPrefix?.trim() || "/static";

  const proxy: Record<
    string,
    { target: string; changeOrigin: true; rewrite?: (p: string) => string }
  > = {
    "/api": {
      target: targetUrl,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, apiPrefix),
    },
    "/static": {
      target: targetUrl,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/static/, staticPrefix),
    },
  };

  for (const extraPath of options.extraPaths ?? []) {
    proxy[extraPath] = { target: targetUrl, changeOrigin: true };
  }

  return { proxy };
}

// Empty default export prevents VS Code Vitest extension from erroring
export default {};

export const viteConfig = {
  staged: { "*": "vp check" },
  fmt: {},
  lint: {},
} satisfies UserConfig;
