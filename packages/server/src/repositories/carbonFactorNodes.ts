import { db } from "@/config/database";
import { carbonFactorNodes } from "@/schemas/carbonFactorNodes";

export async function refreshCarbonFactorNodes(
  nodes: {
    pkid: string;
    name: string;
    fullName?: string;
    nameEn?: string;
    parentPkid?: string;
    isLeaf: boolean;
  }[],
): Promise<void> {
  await db.delete(carbonFactorNodes);
  if (nodes.length) {
    const now = new Date();
    await db.insert(carbonFactorNodes).values(
      nodes.map((n) => ({
        pkid: n.pkid,
        name: n.name,
        fullName: n.fullName ?? null,
        nameEn: n.nameEn ?? null,
        parentPkid: n.parentPkid ?? null,
        isLeaf: n.isLeaf,
        updatedAt: now,
      })),
    );
  }
}

export async function findManyCarbonFactorNodes() {
  const rows = await db.select().from(carbonFactorNodes).orderBy(carbonFactorNodes.id);
  return rows.map((r) => ({
    id: r.id,
    pkid: r.pkid,
    name: r.name,
    fullName: r.fullName ?? undefined,
    nameEn: r.nameEn ?? undefined,
    parentPkid: r.parentPkid ?? undefined,
    isLeaf: r.isLeaf ?? false,
    updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
  }));
}
