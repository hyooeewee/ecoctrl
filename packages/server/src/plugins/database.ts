import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { FastifyInstance } from "fastify";
import { env } from "@/lib/env";

export default async function databasePlugin(fastify: FastifyInstance) {
  const client = postgres(env.DATABASE_URL, { prepare: false });
  const db = drizzle(client);
  fastify.decorate("db", db);
}
