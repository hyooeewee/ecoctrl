import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

let dbInstance: PostgresJsDatabase | undefined;

export function getDb(): PostgresJsDatabase {
  if (!dbInstance) {
    const client = postgres(process.env.DATABASE_URL!, { prepare: false });
    dbInstance = drizzle(client);
  }
  return dbInstance;
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
