import type { BusinessObject } from "@ecoctrl/shared";

import { get, post, put, del } from "./request";

export const objectsApi = {
  list: () => get<BusinessObject[]>("/objects"),

  create: (data: Omit<BusinessObject, "uuid">) => post<BusinessObject>("/objects", data),

  update: (uuid: string, data: Partial<Omit<BusinessObject, "uuid">>) =>
    put<BusinessObject>(`/objects/${uuid}`, data),

  delete: (uuid: string) => del<void>(`/objects/${uuid}`),
};
