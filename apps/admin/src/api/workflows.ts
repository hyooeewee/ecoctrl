import { get, post, put, del } from "./request";
import type { WorkflowListItem, WorkflowDSL } from "@/components/workflow-editor/types";

export interface WorkflowCreateBody {
  slug: string;
  name: string;
  description?: string;
  enabled?: boolean;
  dsl: WorkflowDSL;
}

export interface WorkflowUpdateBody extends Partial<WorkflowCreateBody> {}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const workflowsApi = {
  list: (page = 1, pageSize = 20) =>
    get<PaginatedResult<WorkflowListItem>>("/workflows", {
      params: { page: String(page), pageSize: String(pageSize) },
    }),

  getById: (id: string) => get<WorkflowListItem & { dsl: WorkflowDSL }>(`/workflows/${id}`),

  create: (body: WorkflowCreateBody) => post<{ id: string }>("/workflows", body),

  update: (id: string, body: WorkflowUpdateBody) =>
    put<{ success: boolean }>(`/workflows/${id}`, body),

  delete: (id: string) => del<void>(`/workflows/${id}`),

  trigger: (id: string, data?: Record<string, unknown>) =>
    post<{ executionId: string }>(`/workflows/${id}/trigger`, { data }),

  test: (id: string, data?: Record<string, unknown>) =>
    post<{
      status: string;
      output?: Record<string, unknown>;
      error?: string;
      nodeLogs: Array<{
        nodeId: string;
        nodeName: string;
        nodeType: string;
        status: string;
        error?: string;
      }>;
      dryRun?: boolean;
    }>(`/workflows/${id}/test`, { data }),

  getExecutions: (id: string, page = 1, pageSize = 20) =>
    get<PaginatedResult<unknown>>(`/workflows/${id}/executions`, {
      params: { page: String(page), pageSize: String(pageSize) },
    }),
};
