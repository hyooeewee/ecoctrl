import type { BusinessObject } from "@ecoctrl/shared";

import { get, post, put, del } from "./request";

export const objectsApi = {
  list: () => get<BusinessObject[]>("/objects"),

  create: (data: Omit<BusinessObject, "id">) => post<BusinessObject>("/objects", data),

  update: (id: string, data: Partial<Omit<BusinessObject, "id">>) =>
    put<BusinessObject>(`/objects/${id}`, data),

  delete: (id: string) => del<void>(`/objects/${id}`),
};
