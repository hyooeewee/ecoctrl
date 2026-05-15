import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EnergyAreaSchema, CarbonFactorSchema } from "@ecoctrl/shared";
import type { EnergyArea } from "@ecoctrl/shared";
import { findManyEnergyAreas, updateEnergyAreas } from "@/repositories/energyAreas";
import { findManyCarbonFactors, replaceCarbonFactorsForPkid } from "@/repositories/carbonFactors";
import {
  findManyCarbonFactorNodes,
  refreshCarbonFactorNodes,
} from "@/repositories/carbonFactorNodes";
import { errors } from "@/lib/schemas";
import { getLogger } from "@/lib/logger";

const logger = getLogger("energy");

const areaBodySchema = z.array(
  z.object({
    title: z.string(),
    current: z.number(),
    target: z.number(),
    color: z.string(),
    powerFactor: z.number(),
    loadRate: z.string(),
  }),
);

const BASE_URL = "https://data.ncsc.org.cn/factories/api";
const CLIENT_ID = "e5cd7e4891bf95d1d19206ce24a7b32e";

interface TerritoryNode {
  pkid: string;
  name: string;
  fullName: string;
  nameEn?: string;
  children: TerritoryNode[];
}

interface TableCell {
  value?: string | null;
  unit?: string | null;
  tableHead?: boolean;
}

function flattenTerritoryNodes(
  nodes: TerritoryNode[],
  parentPkid?: string,
): {
  pkid: string;
  name: string;
  fullName?: string;
  nameEn?: string;
  parentPkid?: string;
  isLeaf: boolean;
}[] {
  const result: {
    pkid: string;
    name: string;
    fullName?: string;
    nameEn?: string;
    parentPkid?: string;
    isLeaf: boolean;
  }[] = [];
  for (const node of nodes) {
    const isLeaf = !node.children || node.children.length === 0;
    result.push({
      pkid: node.pkid,
      name: node.name,
      fullName: node.fullName,
      nameEn: node.nameEn,
      parentPkid,
      isLeaf,
    });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTerritoryNodes(node.children, node.pkid));
    }
  }
  return result;
}

async function fetchTerritoryList(): Promise<TerritoryNode[]> {
  const url = `${BASE_URL}/factor/territory/list?factorLibraryId=1823254278404255746&type=1&state=submit&yearId=1823254278186151937&cnAndEnFlag=0`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      clientid: CLIENT_ID,
      Referer: "https://data.ncsc.org.cn/factories/indexMod/indexModIlibrary",
      "User-Agent": "Mozilla/5.0",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`territory/list returned ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as { code?: number; msg?: string; data?: TerritoryNode[] };
  if (json.code !== 200) {
    throw new Error(json.msg || `territory/list error (code: ${json.code})`);
  }
  return json.data ?? [];
}

async function fetchFactorTables(pkid: string): Promise<TableCell[][]> {
  const url = `${BASE_URL}/factor/metaData/getFactorTables?pkid=${pkid}&cacheFlag=true&pageSize=20&pageNum=1&cnAndEnFlag=0`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      clientid: CLIENT_ID,
      Referer: "https://data.ncsc.org.cn/factories/indexMod/indexModIlibrary",
      "User-Agent": "Mozilla/5.0",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`getFactorTables returned ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as {
    code?: number;
    msg?: string;
    data?: { total?: number; result?: { territoryId?: string; result?: TableCell[][] }[] };
  };
  if (json.code !== 200) {
    throw new Error(json.msg || `getFactorTables error (code: ${json.code})`);
  }
  const result = json.data?.result?.[0];
  return result?.result ?? [];
}

function parseFactorTable(table: TableCell[][], category: string) {
  const rows: {
    name: string;
    category: string;
    value?: number;
    unit?: string;
    rawData: Record<string, unknown>;
    source: string;
  }[] = [];
  if (table.length < 2) return rows;

  const headers = table[0];
  // Find the column index that contains "因子" (factor)
  let factorColIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h?.value && String(h.value).includes("因子")) {
      factorColIndex = i;
      break;
    }
  }
  // If no factor column found, skip parsing
  if (factorColIndex === -1) return rows;

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    if (!row || row.length === 0) continue;
    const firstCol = String(row[0]?.value ?? "").trim();
    if (!firstCol) continue;

    const factorCell = row[factorColIndex];
    const factorValue = factorCell?.value;
    const factorUnit = factorCell?.unit;
    const numValue =
      typeof factorValue === "string" ? Number.parseFloat(factorValue) : Number(factorValue);

    rows.push({
      name: firstCol,
      category,
      value: Number.isFinite(numValue) ? numValue : undefined,
      unit: factorUnit ? String(factorUnit) : undefined,
      rawData: { row: row.map((c) => c?.value), headers: headers.map((h) => h?.value) },
      source: "国家温室气体排放因子库",
    });
  }
  return rows;
}

export default async function energyRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => reply.send([]));

  fastify.get(
    "/areas",
    {
      schema: {
        tags: ["Energy"],
        summary: "Get energy areas",
        response: { 200: z.array(EnergyAreaSchema) },
      },
    },
    async (_request, reply) => {
      const areas = await findManyEnergyAreas();
      return reply.send(areas);
    },
  );

  fastify.put(
    "/areas",
    {
      schema: {
        tags: ["Energy"],
        summary: "Update energy areas",
        body: areaBodySchema,
        response: { 200: z.array(EnergyAreaSchema) },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<EnergyArea, "id">[];
      await updateEnergyAreas(body);
      const areas = await findManyEnergyAreas();
      return reply.send(areas);
    },
  );

  // Carbon factor routes

  fastify.get(
    "/carbon-factors",
    {
      schema: {
        tags: ["Energy"],
        summary: "Get stored carbon emission factors",
        response: { 200: z.array(CarbonFactorSchema) },
      },
    },
    async (_request, reply) => {
      const factors = await findManyCarbonFactors();
      return reply.send(factors);
    },
  );

  fastify.get(
    "/carbon-factors/tree",
    {
      schema: {
        tags: ["Energy"],
        summary: "Get carbon emission factor category tree",
        response: {
          200: z.array(
            z.object({
              id: z.number(),
              pkid: z.string(),
              name: z.string(),
              fullName: z.string().optional(),
              nameEn: z.string().optional(),
              parentPkid: z.string().optional(),
              isLeaf: z.boolean(),
              updatedAt: z.string(),
            }),
          ),
        },
      },
    },
    async (_request, reply) => {
      const nodes = await findManyCarbonFactorNodes();
      return reply.send(nodes);
    },
  );

  fastify.post(
    "/carbon-factors/refresh",
    {
      schema: {
        tags: ["Energy"],
        summary: "Refresh carbon emission factor category tree from external API",
        response: {
          200: z.object({ count: z.number() }),
          ...errors,
        },
      },
    },
    async (_request, reply) => {
      try {
        const territories = await fetchTerritoryList();
        const nodes = flattenTerritoryNodes(territories);
        await refreshCarbonFactorNodes(nodes);
        return reply.send({ count: nodes.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("[CarbonFactors] Refresh tree failed:", message);
        return reply.status(500).send({ error: message });
      }
    },
  );

  const fetchBodySchema = z.object({ pkid: z.string() });

  fastify.post(
    "/carbon-factors/fetch",
    {
      schema: {
        tags: ["Energy"],
        summary: "Fetch carbon emission factors for a specific node",
        body: fetchBodySchema,
        response: {
          200: z.object({
            count: z.number(),
            data: z.array(CarbonFactorSchema),
          }),
          ...errors,
        },
      },
    },
    async (request, reply) => {
      const { pkid } = request.body as { pkid: string };
      try {
        const tables = await fetchFactorTables(pkid);

        // Find node name for category
        const nodes = await findManyCarbonFactorNodes();
        const node = nodes.find((n) => n.pkid === pkid);
        const category = node?.fullName || node?.name || pkid;

        const parsed = parseFactorTable(tables, category);
        await replaceCarbonFactorsForPkid(pkid, parsed);

        // Return fresh data from DB to ensure consistent shape
        const allFactors = await findManyCarbonFactors();
        const filtered = allFactors.filter((f) => f.pkid === pkid);

        return reply.send({ count: filtered.length, data: filtered });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[CarbonFactors] Fetch failed for ${pkid}:`, message);
        return reply.status(500).send({ error: message });
      }
    },
  );
}
