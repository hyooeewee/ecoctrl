import { config } from "dotenv";
import { defineConfig, type Config } from "drizzle-kit";

config({ path: ".env.local", override: false });

export default defineConfig({
  schema: "./src/schemas/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
}) satisfies Config;
