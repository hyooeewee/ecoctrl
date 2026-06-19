import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { LightingGroupSchema } from "@ecoctrl/shared";

// ========================================
// In-memory lighting config (seeded from config side)
// ========================================

interface LightingGroupConfig {
  label: string;
  opened: boolean;
}

const lightingConfig: Record<string, Record<string, LightingGroupConfig>> = {
  南序厅: {
    G1: { label: "雨棚", opened: true },
    G2: { label: "南序厅半幅（含外门顶）", opened: true },
    G3: { label: "南序厅半幅（含外门顶）", opened: true },
    G4: { label: "南序厅西门厅", opened: false },
    G5: { label: "南序厅中门厅", opened: false },
    G6: { label: "南序厅东门厅", opened: false },
  },
};

// ========================================
// Helpers
// ========================================

function parseGroupIndex(key: string): number {
  const match = /^G(\d+)$/i.exec(key);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function getSortedGroups(region: string): { key: string; label: string; opened: boolean }[] {
  const groups = lightingConfig[region] ?? {};
  return Object.entries(groups)
    .map(([key, cfg]) => ({ key, ...cfg }))
    .sort((a, b) => parseGroupIndex(a.key) - parseGroupIndex(b.key));
}

// ========================================
// Schemas
// ========================================

const toggleBodySchema = z.object({
  opened: z.boolean(),
});

const batchBodySchema = z.object({
  opened: z.boolean(),
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
      const { opened } = request.body as { opened: boolean };

      const regionGroups = lightingConfig[region];
      if (!regionGroups) {
        return reply.status(404).send({ error: `Region not found: ${region}` });
      }
      const group = regionGroups[groupKey];
      if (!group) {
        return reply.status(404).send({ error: `Group not found: ${groupKey}` });
      }

      group.opened = opened;
      return reply.send({ group: { key: groupKey, label: group.label, opened: group.opened } });
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
      const { opened } = request.body as { opened: boolean };

      const regionGroups = lightingConfig[region];
      if (!regionGroups) {
        return reply.status(404).send({ error: `Region not found: ${region}` });
      }

      for (const cfg of Object.values(regionGroups)) {
        cfg.opened = opened;
      }

      return reply.send({ region, groups: getSortedGroups(region) });
    },
  );
}
