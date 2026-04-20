import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
const dbName = DATABASE_URL.split("/").pop() || "ecoctrl";

// Connection to the target database for dropping tables
const sql = postgres(DATABASE_URL, { prepare: false });

// Admin connection for database-level operations (uncomment when needed)
// const adminUrl = DATABASE_URL.replace(/\/[^\/]+$/, "/postgres");
// const adminSql = postgres(adminUrl, { prepare: false });

async function main() {
  console.log(`Dropping all tables in database "${dbName}"...`);
  await sql.unsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  console.log(`All tables in "${dbName}" dropped successfully.`);

  // // The following code drops and recreates the entire database.
  // // Uncomment if you need to recreate the database itself.
  //
  // console.log(`Terminating existing connections to "${dbName}"...`);
  // await adminSql.unsafe(`
  //   SELECT pg_terminate_backend(pid)
  //   FROM pg_stat_activity
  //   WHERE datname = '${dbName}'
  //     AND pid <> pg_backend_pid()
  // `);
  //
  // console.log(`Dropping database "${dbName}"...`);
  // await adminSql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
  // console.log(`Creating database "${dbName}"...`);
  // await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);
  // console.log(`Database "${dbName}" recreated successfully.`);
  // await adminSql.end();

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
