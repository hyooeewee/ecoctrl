import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { dashboardModels } from "@/schemas/dashboardModel";
import { readPointValues, writePointValues } from "@/services/iot/points";
import { sseManager } from "@/sse/manager";
import type { DashboardModelLabel } from "@ecoctrl/shared";

// ========================================
// Types
// ========================================

type LightingStatus = "off" | "half" | "on";

interface GroupStatusResult {
  id: string;
  name: string;
  status: LightingStatus;
}

// ========================================
// Mock fallback (used when IoT service is unavailable)
// ========================================

const mockGroupStore: Record<string, LightingStatus> = {};

function getMockStatus(pointIds: string[]): LightingStatus {
  const total = pointIds.length;
  if (total === 0) return "off";
  const onCount = pointIds.filter((id) => mockGroupStore[id] === "on").length;
  if (onCount === 0) return "off";
  if (onCount === total) return "on";
  return "half";
}

function setMockStatus(pointIds: string[], status: "off" | "on"): void {
  for (const id of pointIds) {
    mockGroupStore[id] = status;
  }
}

// ========================================
// Helpers
// ========================================

/** Fetch label from DB by meta.id */
async function findLabel(labelId: string): Promise<DashboardModelLabel | null> {
  const [row] = await db.select().from(dashboardModels).limit(1);
  if (!row) return null;
  const labels = (row.labels ?? []) as DashboardModelLabel[];
  return labels.find((l) => l.meta.id === labelId) ?? null;
}

/** Parse IoT response into flat { pointId: value } map */
function parseIotResponse(raw: unknown): Record<string, unknown> {
  const obj = raw as Record<string, unknown>;
  // IoT returns { code, ResultPointObjArr: [{ pointId, value, time }] }
  const arr = obj.ResultPointObjArr;
  if (Array.isArray(arr)) {
    const map: Record<string, unknown> = {};
    for (const item of arr) {
      const { pointId, value } = item as { pointId: string; value: unknown };
      if (pointId) map[pointId] = value;
    }
    return map;
  }
  // Fallback: if already flat, return as-is
  return obj;
}

/** Read BACnet points with IoT fallback to mock */
async function readPoints(pointIds: string[]): Promise<Record<string, unknown>> {
  try {
    const raw = await readPointValues(pointIds);
    return parseIotResponse(raw);
  } catch (err) {
    console.warn("[lighting] IoT read failed, using mock fallback:", (err as Error).message);
    // Return mock values
    const result: Record<string, unknown> = {};
    for (const id of pointIds) {
      result[id] = mockGroupStore[id] === "on" ? 1 : 0;
    }
    return result;
  }
}

/** Write BACnet points with IoT fallback to mock */
async function writePoints(points: Array<{ pointId: string; value: unknown }>): Promise<void> {
  try {
    await writePointValues(points);
  } catch (err) {
    console.warn("[lighting] IoT write failed, using mock fallback:", (err as Error).message);
    // Apply to mock store
    for (const { pointId, value } of points) {
      mockGroupStore[pointId] = value === 1 || value === "1" || value === true ? "on" : "off";
    }
  }
}

/** Calculate group status from point values */
function calcGroupStatus(pointValues: Record<string, unknown>, pointIds: string[]): LightingStatus {
  const total = pointIds.length;
  if (total === 0) return "off";

  const onCount = pointIds.filter((id) => {
    const v = pointValues[id];
    return v === 1 || v === "1" || v === true;
  }).length;

  if (onCount === 0) return "off";
  if (onCount === total) return "on";
  return "half";
}

/** Broadcast lighting update via SSE */
function broadcastLightingUpdate(labelId: string, groups: GroupStatusResult[]): void {
  sseManager.broadcast({
    type: "lighting_update",
    payload: { labelId, groups },
    timestamp: new Date().toISOString(),
  });
}

// ========================================
// Schemas
// ========================================

const statusEnum = z.enum(["off", "half", "on"]);

const groupStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: statusEnum,
});

const toggleSchema = z.object({
  id: z.string(),
  status: z.enum(["off", "on"]),
});

const batchSchema = z.object({
  status: z.enum(["off", "on"]),
});

const errorResponse = {
  400: z.object({ error: z.string() }),
  404: z.object({ error: z.string() }),
  500: z.object({ error: z.string() }),
};

// ========================================
// Routes
// ========================================

export default async function lightingRoutes(fastify: FastifyInstance) {
  // ── GET /:labelId/status — query group statuses ─────────────────────────────

  fastify.get(
    "/:labelId/status",
    {
      schema: {
        tags: ["Lighting"],
        summary: "Get lighting group statuses for a label",
        security: [],
        params: z.object({ labelId: z.string() }),
        response: {
          200: z.object({ groups: z.array(groupStatusSchema) }),
          ...errorResponse,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { labelId } = request.params as { labelId: string };

      const label = await findLabel(labelId);
      if (!label) {
        return reply.status(404).send({ error: `Label not found: ${labelId}` });
      }

      const groups = label.groups ?? [];
      if (groups.length === 0) {
        return reply.send({ groups: [] });
      }

      // Collect all pointIds across groups
      const allPointIds = groups.flatMap((g) => g.pointIds ?? []);
      if (allPointIds.length === 0) {
        return reply.send({
          groups: groups.map((g) => ({ id: g.id, name: g.name, status: "off" as const })),
        });
      }

      // Batch read from BACnet (with mock fallback)
      const pointValues = await readPoints(allPointIds);

      // Calculate status per group
      const results: GroupStatusResult[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        status: calcGroupStatus(pointValues, g.pointIds ?? []),
      }));

      return reply.send({ groups: results });
    },
  );

  // ── POST /:labelId/toggle — toggle a single group ───────────────────────────

  fastify.post(
    "/:labelId/toggle",
    {
      schema: {
        tags: ["Lighting"],
        summary: "Toggle a lighting group",
        security: [{ bearerAuth: [] }],
        params: z.object({ labelId: z.string() }),
        body: toggleSchema,
        response: {
          200: z.object({ id: z.string(), name: z.string(), status: statusEnum }),
          ...errorResponse,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { labelId } = request.params as { labelId: string };
      const { id, status } = request.body as { id: string; status: "off" | "on" };

      const label = await findLabel(labelId);
      if (!label) {
        return reply.status(404).send({ error: `Label not found: ${labelId}` });
      }

      const group = (label.groups ?? []).find((g) => g.id === id);
      if (!group) {
        return reply.status(404).send({ error: `Group not found: ${id}` });
      }

      const pointIds = group.pointIds ?? [];
      if (pointIds.length === 0) {
        return reply.send({ id: group.id, name: group.name, status: "off" });
      }

      // Write target value to all points in the group
      const value = status === "on" ? 1 : 0;
      await writePoints(pointIds.map((pid) => ({ pointId: pid, value })));

      // Give IoT devices time to propagate before reading back
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Read back to confirm actual state
      const pointValues = await readPoints(pointIds);
      const actualStatus = calcGroupStatus(pointValues, pointIds);

      const result = { id: group.id, name: group.name, status: actualStatus };

      // Broadcast via SSE
      broadcastLightingUpdate(labelId, [result]);

      return reply.send(result);
    },
  );

  // ── POST /:labelId/batch — batch toggle all groups under a label ────────────

  fastify.post(
    "/:labelId/batch",
    {
      schema: {
        tags: ["Lighting"],
        summary: "Batch toggle all lighting groups under a label",
        security: [{ bearerAuth: [] }],
        params: z.object({ labelId: z.string() }),
        body: batchSchema,
        response: {
          200: z.object({ groups: z.array(groupStatusSchema) }),
          ...errorResponse,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { labelId } = request.params as { labelId: string };
      const { status } = request.body as { status: "off" | "on" };

      const label = await findLabel(labelId);
      if (!label) {
        return reply.status(404).send({ error: `Label not found: ${labelId}` });
      }

      const groups = label.groups ?? [];
      if (groups.length === 0) {
        return reply.send({ groups: [] });
      }

      // Collect all pointIds
      const allPointIds = groups.flatMap((g) => g.pointIds ?? []);
      if (allPointIds.length === 0) {
        return reply.send({
          groups: groups.map((g) => ({ id: g.id, name: g.name, status: "off" as const })),
        });
      }

      // Write target value to all points
      const value = status === "on" ? 1 : 0;
      await writePoints(allPointIds.map((pid) => ({ pointId: pid, value })));

      // Give IoT devices time to propagate before reading back
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Read back all points
      const pointValues = await readPoints(allPointIds);

      // Calculate status per group
      const results: GroupStatusResult[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        status: calcGroupStatus(pointValues, g.pointIds ?? []),
      }));

      // Broadcast via SSE
      broadcastLightingUpdate(labelId, results);

      return reply.send({ groups: results });
    },
  );
}
