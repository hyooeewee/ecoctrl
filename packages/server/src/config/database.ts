import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { env } from "@/lib/env";

let dbInstance: PostgresJsDatabase | undefined;
let dbClient: ReturnType<typeof postgres> | undefined;

export function getDb(): PostgresJsDatabase {
  if (!dbInstance) {
    const dbUrl = process.env.VITEST_DATABASE_URL || env.DATABASE_URL;
    dbClient = postgres(dbUrl, { prepare: false });
    dbInstance = drizzle(dbClient);
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbClient) {
    await dbClient.end();
    dbClient = undefined;
    dbInstance = undefined;
  }
}

// Re-export for backward compatibility during migration
export const db = new Proxy({} as PostgresJsDatabase, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof PostgresJsDatabase];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
