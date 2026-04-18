import type { FastifyInstance } from "fastify";

export default async function faultRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => reply.send([]));
}
