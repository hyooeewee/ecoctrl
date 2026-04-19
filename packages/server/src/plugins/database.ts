import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { FastifyInstance } from "fastify";

export default async function databasePlugin(fastify: FastifyInstance) {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);
  fastify.decorate("db", db);
}
