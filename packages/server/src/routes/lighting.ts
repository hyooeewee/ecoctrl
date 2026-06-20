import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { LightingGroupSchema } from "@ecoctrl/shared";

// ========================================
// In-memory lighting config (seeded from config side)
// ========================================

type LightingStatus = "off" | "half" | "on";

interface LightingGroupConfig {
  label: string;
  status: LightingStatus;
}

const lightingConfig: Record<string, Record<string, LightingGroupConfig>> = {
  南序厅: {
    G1: { label: "雨棚", status: "on" },
    G2: { label: "南序厅半幅（含外门顶）", status: "half" },
    G3: { label: "南序厅半幅（含外门顶）", status: "on" },
    G4: { label: "南序厅西门厅", status: "off" },
    G5: { label: "南序厅中门厅", status: "off" },
    G6: { label: "南序厅东门厅", status: "off" },
  },
  西序厅: {
    G1: { label: "入口雨棚", status: "on" },
    G2: { label: "西序厅主照明", status: "off" },
    G3: { label: "西侧走廊", status: "half" },
    G4: { label: "西序厅 VIP 区", status: "off" },
  },
  东序厅: {
    G1: { label: "入口雨棚", status: "on" },
    G2: { label: "东序厅主照明", status: "on" },
    G3: { label: "东侧走廊", status: "off" },
    G4: { label: "东序厅展示区", status: "on" },
  },
  北序厅: {
    G1: { label: "入口雨棚", status: "off" },
    G2: { label: "北序厅主照明", status: "off" },
    G3: { label: "北侧走廊", status: "off" },
    G4: { label: "北序厅服务区", status: "on" },
  },
  多功能厅1号: {
    G1: { label: "舞台主灯", status: "on" },
    G2: { label: "观众席照明", status: "off" },
    G3: { label: "侧光", status: "half" },
    G4: { label: "顶光", status: "off" },
  },
  多功能厅2号: {
    G1: { label: "舞台主灯", status: "off" },
    G2: { label: "观众席照明", status: "off" },
    G3: { label: "侧光", status: "off" },
    G4: { label: "顶光", status: "off" },
  },
};

// ========================================
// Helpers
// ========================================

function parseGroupIndex(key: string): number {
  const match = /^G(\d+)$/i.exec(key);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function getSortedGroups(region: string): { key: string; label: string; status: LightingStatus }[] {
  const groups = lightingConfig[region] ?? {};
  return Object.entries(groups)
    .map(([key, cfg]) => ({ key, ...cfg }))
    .sort((a, b) => parseGroupIndex(a.key) - parseGroupIndex(b.key));
}

// ========================================
// Schemas
// ========================================

const toggleBodySchema = z.object({
  status: z.enum(["off", "on"]),
});

const batchBodySchema = z.object({
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
  fastify.get(
    "/regions",
    {
      schema: {
        tags: ["Lighting"],
        summary: "List available lighting regions",
        security: [],
        response: {
          200: z.object({ regions: z.array(z.string()) }),
          ...errorResponse,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ regions: Object.keys(lightingConfig) });
    },
  );

  fastify.get(
    "/:region/groups",
    {
      schema: {
        tags: ["Lighting"],
        summary: "Get lighting groups for a region",
        security: [],
        params: z.object({ region: z.string() }),
        response: {
          200: z.object({
            region: z.string(),
            groups: z.array(LightingGroupSchema),
          }),
          ...errorResponse,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { region } = request.params as { region: string };
      return reply.send({ region, groups: getSortedGroups(region) });
    },
  );

  fastify.post(
    "/:region/:groupKey",
    {
      schema: {
        tags: ["Lighting"],
        summary: "Toggle a single lighting group",
        security: [{ bearerAuth: [] }],
        params: z.object({ region: z.string(), groupKey: z.string() }),
        body: toggleBodySchema,
        response: {
          200: z.object({ group: LightingGroupSchema }),
          ...errorResponse,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { region, groupKey } = request.params as { region: string; groupKey: string };
      const { status } = request.body as { status: "off" | "on" };

      const regionGroups = lightingConfig[region];
      if (!regionGroups) {
        return reply.status(404).send({ error: `Region not found: ${region}` });
      }
      const group = regionGroups[groupKey];
      if (!group) {
        return reply.status(404).send({ error: `Group not found: ${groupKey}` });
      }

      group.status = status;
      return reply.send({ group: { key: groupKey, label: group.label, status: group.status } });
    },
  );

  fastify.post(
    "/:region/batch",
    {
      schema: {
        tags: ["Lighting"],
        summary: "Batch update all lighting groups in a region",
        security: [{ bearerAuth: [] }],
        params: z.object({ region: z.string() }),
        body: batchBodySchema,
        response: {
          200: z.object({ groups: z.array(LightingGroupSchema) }),
          ...errorResponse,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { region } = request.params as { region: string };
      const { status } = request.body as { status: "off" | "on" };

      const regionGroups = lightingConfig[region];
      if (!regionGroups) {
        return reply.status(404).send({ error: `Region not found: ${region}` });
      }

      for (const cfg of Object.values(regionGroups)) {
        cfg.status = status;
      }

      return reply.send({ region, groups: getSortedGroups(region) });
    },
  );
}
