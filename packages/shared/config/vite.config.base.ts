import type { UserConfig } from "vite-plus";

export interface DevProxyOptions {
  extraPaths?: string[];
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
