import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@/config/database";
import { workflows, workflowExecutions } from "@/schemas/workflows";
import type { WorkflowDSL } from "@/engine/types";

export interface WorkflowListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  tags: string[];
  version: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WorkflowDetail {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  dsl: WorkflowDSL;
  publishedDsl: WorkflowDSL | null;
  version: number;
  isLatest: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export async function findManyWorkflows(
  userId: string,
  userRole: string,
  page: number,
  pageSize: number,
): Promise<{ items: WorkflowListItem[]; total: number }> {
  const whereClause = userRole === "super_admin" ? undefined : eq(workflows.userId, userId);

  const totalResult = await db.select({ count: count() }).from(workflows).where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  const rows = await db
    .select({
      id: workflows.id,
      slug: workflows.slug,
      name: workflows.name,
      description: workflows.description,
      enabled: workflows.enabled,
      dsl: workflows.dsl,
      version: workflows.version,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
    })
    .from(workflows)
    .where(whereClause)
    .orderBy(desc(workflows.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items = rows.map((r) => ({
    ...r,
    triggerType: (r.dsl as { trigger?: { type: string } }).trigger?.type ?? "manual",
    tags: (r.dsl as { trigger?: { config?: { tags?: string[] } } }).trigger?.config?.tags ?? [],
  }));

  return { items, total };
}

export async function findWorkflowById(id: string): Promise<WorkflowDetail | null> {
  const rows = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    userId: r.userId,
    slug: r.slug,
    name: r.name,
    description: r.description,
    enabled: r.enabled,
    dsl: r.dsl as WorkflowDSL,
    publishedDsl: r.publishedDsl as WorkflowDSL | null,
    version: r.version,
    isLatest: r.isLatest,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function findWorkflowBySlug(
  slug: string,
  userId: string,
): Promise<WorkflowDetail | null> {
  const rows = await db
    .select()
    .from(workflows)
    .where(
      and(eq(workflows.slug, slug), eq(workflows.userId, userId), eq(workflows.isLatest, true)),
    )
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    userId: r.userId,
    slug: r.slug,
    name: r.name,
    description: r.description,
    enabled: r.enabled,
    dsl: r.dsl as WorkflowDSL,
    publishedDsl: r.publishedDsl as WorkflowDSL | null,
    version: r.version,
    isLatest: r.isLatest,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createWorkflow(
  userId: string,
  data: {
    slug: string;
    name: string;
    description?: string;
    enabled?: boolean;
    dsl: WorkflowDSL;
  },
): Promise<string> {
  const [result] = await db
    .insert(workflows)
    .values({
      userId,
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      enabled: data.enabled ?? true,
      dsl: data.dsl as unknown as Record<string, unknown>,
      version: 1,
      isLatest: true,
    })
    .returning({ id: workflows.id });
  return result.id;
}

export async function updateWorkflow(
  id: string,
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    dsl?: WorkflowDSL;
    publishedDsl?: WorkflowDSL | null;
    bumpVersion?: boolean;
  },
): Promise<void> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.dsl !== undefined) {
    updateData.dsl = data.dsl as unknown as Record<string, unknown>;
  }
  if (data.bumpVersion) {
    const current = await findWorkflowById(id);
    if (current) {
      updateData.version = current.version + 1;
    }
  }
  if (data.publishedDsl !== undefined) {
    updateData.publishedDsl = data.publishedDsl
      ? (data.publishedDsl as unknown as Record<string, unknown>)
      : null;
  }
  await db.update(workflows).set(updateData).where(eq(workflows.id, id));
}

export async function deleteWorkflow(id: string): Promise<void> {
  await db.delete(workflows).where(eq(workflows.id, id));
}

export async function checkWorkflowAccess(
  workflowId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "super_admin") return true;
  const workflow = await findWorkflowById(workflowId);
  return workflow?.userId === userId;
}

export async function findWorkflowExecutions(
  workflowId: string,
  page: number,
  pageSize: number,
): Promise<{ items: (typeof workflowExecutions.$inferSelect)[]; total: number }> {
  const whereClause = eq(workflowExecutions.workflowId, workflowId);

  const totalResult = await db
    .select({ count: count() })
    .from(workflowExecutions)
    .where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  const rows = await db
    .select()
    .from(workflowExecutions)
    .where(whereClause)
    .orderBy(desc(workflowExecutions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items: rows, total };
}
