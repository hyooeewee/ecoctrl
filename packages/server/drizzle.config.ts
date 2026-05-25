import { config } from "dotenv";
import { defineConfig, type Config } from "drizzle-kit";

config({ path: ".env.local", override: false });

console.log("Using database URL:", process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/schemas/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.VITEST_DATABASE_URL || process.env.DATABASE_URL!,
  },
}) satisfies Config;
