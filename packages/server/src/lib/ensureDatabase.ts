import postgres from "postgres";

export async function ensureDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL!;
  // Connect to the postgres system database to check/create target DB
  const adminUrl = databaseUrl.replace(/\/[^\/]+$/, "/postgres");
  const sql = postgres(adminUrl, { prepare: false });

  // Extract DB name from DATABASE_URL (last path segment)
  const dbName = databaseUrl.split("/").pop() || "ecoctrl";

  const dbs = await sql`SELECT datname FROM pg_database WHERE datname = ${dbName}`;
  if (dbs.length === 0) {
    await sql.unsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`Database ${dbName} created.`);
  }

  await sql.end();
}
