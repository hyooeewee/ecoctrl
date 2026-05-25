import postgres from "postgres";
import { resetDatabase } from "./src/lib/ensureDatabase";
import { migrateDatabase } from "./src/lib/migrateDatabase";

export default async function setup() {
  const testDbUrl = process.env.VITEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!testDbUrl) return;

  await resetDatabase(testDbUrl);
  await migrateDatabase(testDbUrl);

  return async () => {
    const dbName = testDbUrl.split("/").pop() || "ecoctrl";
    const adminUrl = testDbUrl.replace(/\/[^/]+$/, "/postgres");
    const sql = postgres(adminUrl, { prepare: false });

    await sql.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${dbName}'
        AND pid <> pg_backend_pid()
    `);
    await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
    await sql.end();
  };
}
