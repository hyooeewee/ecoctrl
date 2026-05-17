import type { Point } from "@ecoctrl/shared";

import { get, post, put, del } from "./request";

export const pointsApi = {
  list: (params?: { objectId?: string; modelId?: string }) => {
    const query = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return get<Point[]>(`/points${query}`);
  },

  create: (data: Omit<Point, "id">) => post<Point>("/points", data),

  update: (id: string, data: Partial<Omit<Point, "id">>) => put<Point>(`/points/${id}`, data),

  delete: (id: string) => del<void>(`/points/${id}`),
};
