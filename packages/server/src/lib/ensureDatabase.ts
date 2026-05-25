import postgres from "postgres";
import { getLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const logger = getLogger("database");

export async function ensureDatabase(databaseUrl?: string): Promise<void> {
  const targetUrl = databaseUrl || env.DATABASE_URL;
  // Connect to the postgres system database to check/create target DB
  const adminUrl = targetUrl.replace(/\/[^/]+$/, "/postgres");
  const sql = postgres(adminUrl, { prepare: false });

  // Extract DB name from URL (last path segment)
  const dbName = targetUrl.split("/").pop() || "ecoctrl";

  const dbs = await sql`SELECT datname FROM pg_database WHERE datname = ${dbName}`;
  if (dbs.length === 0) {
    try {
      await sql.unsafe(`CREATE DATABASE "${dbName}"`);
      logger.info(`Database ${dbName} created.`);
    } catch (err) {
      // Ignore race-condition duplicate creation (code 42P04)
      const code = (err as { code?: string }).code;
      if (code !== "42P04") throw err;
    }
  }

  await sql.end();
}

export async function resetDatabase(databaseUrl?: string): Promise<void> {
  const targetUrl = databaseUrl || env.DATABASE_URL;
  const dbName = targetUrl.split("/").pop() || "ecoctrl";
  const adminUrl = targetUrl.replace(/\/[^/]+$/, "/postgres");

  const sql = postgres(adminUrl, { prepare: false });

  await sql.unsafe(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${dbName}'
      AND pid <> pg_backend_pid()
  `);
  await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
  await sql.unsafe(`CREATE DATABASE "${dbName}"`);

  await sql.end();
}
