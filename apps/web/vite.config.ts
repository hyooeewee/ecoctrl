import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["app/components", ".claude/"],
  },
  lint: {
    ignorePatterns: ["app/components", ".claude/"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    fs: {
      // Allow serving files from the monorepo root (parent of the worktree)
      allow: ["../../../../"],
    },
  },
});
