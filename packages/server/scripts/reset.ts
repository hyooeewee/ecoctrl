import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import * as schema from "@/schemas/index";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  console.log("Resetting database...");
  await reset(db, schema);
  console.log("Done!");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
