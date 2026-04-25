import { defineConfig } from "rolldown";
import path from "node:path";

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

  external: [
    /^node:/,
    "fastify",
    "@fastify/cors",
    "@fastify/multipart",
    "@fastify/static",
    "@fastify/swagger",
    "@fastify/swagger-ui",
    "@fastify/jwt",
    "dotenv",
    "drizzle-orm",
    "postgres",
    "bcryptjs",
    "zod",
    "unzipper",
    "nodemailer",
  ],
});
