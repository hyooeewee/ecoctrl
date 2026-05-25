import { resetDatabase } from "./src/lib/ensureDatabase";
import { migrateDatabase } from "./src/lib/migrateDatabase";

export default async function setup() {
  const testDbUrl = process.env.VITEST_DATABASE_URL || process.env.DATABASE_URL;
  if (testDbUrl) {
    await resetDatabase(testDbUrl);
    await migrateDatabase(testDbUrl);
  }
}
