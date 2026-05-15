import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "@/lib/env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrateDatabase(): Promise<void> {
  const client = postgres(env.DATABASE_URL, {
    prepare: false,
    max: 1,
  });

  try {
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../../drizzle"),
    });
  } finally {
    await client.end();
  }
}
