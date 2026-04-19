import type { FastifyInstance } from "fastify";
import { iotRequest, ensureToken, authorize } from "@/lib/iotClient";

function pickProp(headers: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  const prop = headers.prop ?? headers.Prop;
  if (typeof prop === "string") result.prop = prop;
  return result;
}

export default async function iotRoutes(fastify: FastifyInstance) {
  fastify.get("/token", async (request, reply) => {
    const { action } = request.query as { action?: string };
    const token = action === "authorize" ? await authorize() : await ensureToken();
    return reply.send({ token: token.slice(0, 8) + "...", active: true });
  });

  fastify.post("/codes/values", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const extraHeaders = pickProp(request.headers as Record<string, unknown>);
    const data = await iotRequest("/_webtalk/_cur/api/getCodesVal", {
      method: "POST",
      body: JSON.stringify(body),
    }, extraHeaders);
    return reply.send(data);
  });

  fastify.post("/codes/history", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const extraHeaders = pickProp(request.headers as Record<string, unknown>);
    const data = await iotRequest("/_webtalk/_cur/api/getCodesHisVal", {
      method: "POST",
      body: JSON.stringify(body),
    }, extraHeaders);
    return reply.send(data);
  });

  fastify.post("/codes/set", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const data = await iotRequest("/_webtalk/_cur/api/setCodesVal", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return reply.send(data);
  });

  fastify.post("/codes/force-set", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const data = await iotRequest("/_webtalk/_cur/api/forceSetCodesVal", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return reply.send(data);
  });

  fastify.post("/alarms", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const data = await iotRequest("/_webtalk/_cur/api/getHisAlarms", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return reply.send(data);
  });

  fastify.post("/alarm-configs", async (_request, reply) => {
    const data = await iotRequest("/_webtalk/_cur/api/getAlarmConfigs", {
      method: "POST",
      body: JSON.stringify({}),
    });
    return reply.send(data);
  });
}
