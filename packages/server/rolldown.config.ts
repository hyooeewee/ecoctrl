import { defineConfig } from "rolldown";
import path from "node:path";

export default defineConfig({
  input: "index.ts",

  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true,
  },

  platform: "node",

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },

  external: [
    /^node:/,
    "fastify",
    "@fastify/cors",
    "@fastify/multipart",
    "@fastify/static",
    "@fastify/swagger",
    "dotenv",
  ],
});
