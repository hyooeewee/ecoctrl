import postgres from "postgres";
import { getLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import { POSTGRES_OPTIONS } from "@/config/database";
import { withRetry } from "@/lib/withRetry";

// ========================================
// Database ensure / reset helpers
// ========================================

const logger = getLogger("database");

function getDbHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export async function ensureDatabase(databaseUrl?: string): Promise<void> {
  const targetUrl = databaseUrl || env.DATABASE_URL;
  const adminUrl = targetUrl.replace(/\/[^/]+$/, "/postgres");
  const dbName = targetUrl.split("/").pop() || "ecoctrl";
  const host = getDbHost(adminUrl);

  await withRetry(
    async () => {
      const sql = postgres(adminUrl, POSTGRES_OPTIONS);
      try {
        const dbs = await sql`SELECT datname FROM pg_database WHERE datname = ${dbName}`;
        if (dbs.length === 0) {
          try {
            await sql.unsafe(`CREATE DATABASE "${dbName}"`);
            logger.info(`Database ${dbName} created.`);
          } catch (err) {
            const code = (err as { code?: string }).code;
            if (code !== "42P04") throw err;
          }
        }
      } finally {
        await sql.end();
      }
    },
    {
      maxRetries: 3,
      delayMs: 2000,
      onRetry: (attempt, max, _err, nextDelayMs) => {
        logger.warn(
          `[ensureDatabase] Attempt ${attempt}/${max} failed for ${host}. ` +
            `Retrying in ${nextDelayMs}ms...`,
        );
      },
    },
  );
}

export async function resetDatabase(databaseUrl?: string): Promise<void> {
  const targetUrl = databaseUrl || env.DATABASE_URL;
  const dbName = targetUrl.split("/").pop() || "ecoctrl";
  const adminUrl = targetUrl.replace(/\/[^/]+$/, "/postgres");
  const host = getDbHost(adminUrl);

  await withRetry(
    async () => {
      const sql = postgres(adminUrl, POSTGRES_OPTIONS);
      try {
        await sql.unsafe(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '${dbName}'
            AND pid <> pg_backend_pid()
        `);
        await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
        await sql.unsafe(`CREATE DATABASE "${dbName}"`);
      } finally {
        await sql.end();
      }
    },
    {
      maxRetries: 3,
      delayMs: 2000,
      onRetry: (attempt, max, _err, nextDelayMs) => {
        logger.warn(
          `[resetDatabase] Attempt ${attempt}/${max} failed for ${host}. ` +
            `Retrying in ${nextDelayMs}ms...`,
        );
      },
    },
  );
}
