import type { FastifyInstance } from "fastify";

export default async function threeDConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => reply.send([]));
}
