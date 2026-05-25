import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import eventsRoute from "../../src/routes/events";

describe("POST /token (SSE)", () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    fastify = Fastify().withTypeProvider<ZodTypeProvider>();
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);

    await fastify.register(fastifyJwt, { secret: "test-secret" });

    // Mock JWT auth hook (same pattern as src/routes/index.ts)
    fastify.addHook("onRequest", async (request, reply) => {
      if (request.url === "/events/token") {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      }
    });

    await fastify.register(eventsRoute, { prefix: "/events" });
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("should reject unauthenticated requests", async () => {
    const res = await fastify.inject({ method: "POST", url: "/events/token" });
    expect(res.statusCode).toBe(401);
  });

  it("should return a short-lived SSE token for authenticated user", async () => {
    const accessToken = fastify.jwt.sign({ id: "user-123", username: "test" });
    const res = await fastify.inject({
      method: "POST",
      url: "/events/token",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeDefined();
    expect(body.expiresIn).toBe(30);

    // Verify the token is valid and has SSE purpose
    const decoded = fastify.jwt.verify(body.token) as { purpose: string; userId: string };
    expect(decoded.purpose).toBe("sse");
    expect(decoded.userId).toBe("user-123");
  });
});
