import type { UserConfig } from "vite-plus";

export const shared = {
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
