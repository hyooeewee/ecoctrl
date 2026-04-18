import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite-plus";

function chromeDevToolsDummy(): Plugin {
  return {
    name: "chrome-devtools-dummy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/.well-known/appspecific/com.chrome.devtools.json") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["app/components", ".claude/"],
    sortImports: true,
    sortTailwindcss: {
      functions: ["cn", "cva", "clsx"],
    },
  },
  lint: {
    ignorePatterns: ["app/components", ".claude/"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: [chromeDevToolsDummy(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
