import { eq, and } from "drizzle-orm";
import type { Point } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { points } from "@/schemas/points";

export async function findManyPoints(): Promise<Point[]> {
  const rows = await db.select().from(points);
  return rows.map((r) => ({
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  }));
}

export async function findPointsByObjectId(objectId: string): Promise<Point[]> {
  const rows = await db.select().from(points).where(eq(points.objectId, objectId));
  return rows.map((r) => ({
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  }));
}

export async function findPointsByModelId(modelId: string): Promise<Point[]> {
  const rows = await db.select().from(points).where(eq(points.modelId, modelId));
  return rows.map((r) => ({
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  }));
}

export async function findPointById(id: string): Promise<Point | null> {
  const rows = await db.select().from(points).where(eq(points.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  };
}

export async function createPoint(data: Omit<Point, "id">): Promise<Point> {
  const result = await db
    .insert(points)
    .values({
      objectId: data.objectId,
      modelId: data.modelId,
      pointType: data.pointType,
      pointNo: data.pointNo,
      name: data.name,
      props: data.props,
      values: data.values,
    })
    .returning();
  const r = result[0];
  return {
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  };
}

export async function createManyPoints(dataList: Omit<Point, "id">[]): Promise<Point[]> {
  const values = dataList.map((data) => ({
    objectId: data.objectId,
    modelId: data.modelId,
    pointType: data.pointType,
    pointNo: data.pointNo,
    name: data.name,
    props: data.props,
    values: data.values,
  }));
  const result = await db.insert(points).values(values).returning();
  return result.map((r) => ({
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  }));
}

export async function updatePoint(
  id: string,
  data: Partial<Omit<Point, "id">>,
): Promise<Point | null> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.props !== undefined) updateData.props = data.props;
  if (data.values !== undefined) updateData.values = data.values;

  const result = await db.update(points).set(updateData).where(eq(points.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  };
}

export async function deletePoint(id: string): Promise<Point | null> {
  const result = await db.delete(points).where(eq(points.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    objectId: r.objectId,
    modelId: r.modelId,
    pointType: r.pointType,
    pointNo: r.pointNo,
    name: r.name,
    props: r.props ?? [],
    values: r.values ?? {},
  };
}

export async function deletePointsByObjectId(objectId: string): Promise<number> {
  const result = await db.delete(points).where(eq(points.objectId, objectId)).returning();
  return result.length;
}

export async function upsertPoint(
  objectId: string,
  pointType: string,
  pointNo: string,
  data: Omit<Point, "id" | "objectId" | "pointType" | "pointNo">,
): Promise<Point> {
  const existing = await db
    .select()
    .from(points)
    .where(
      and(
        eq(points.objectId, objectId),
        eq(points.pointType, pointType),
        eq(points.pointNo, pointNo),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const updated = await updatePoint(existing[0].id, data);
    return updated!;
  }

  return createPoint({
    objectId,
    pointType,
    pointNo,
    modelId: data.modelId,
    name: data.name,
    props: data.props ?? [],
    values: data.values ?? {},
  });
}
