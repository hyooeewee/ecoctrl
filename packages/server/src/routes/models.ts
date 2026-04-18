import type { FastifyInstance } from "fastify";

export default async function modelRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => reply.send([]));
}
