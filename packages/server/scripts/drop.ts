import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
const adminUrl = DATABASE_URL.replace(/\/[^\/]+$/, "/postgres");
const sql = postgres(adminUrl, { prepare: false });

const dbName = DATABASE_URL.split("/").pop() || "ecoctrl";

async function main() {
  console.log(`Dropping database "${dbName}"...`);
  await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
  console.log(`Creating database "${dbName}"...`);
  await sql.unsafe(`CREATE DATABASE "${dbName}"`);
  console.log(`Database "${dbName}" recreated successfully.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
