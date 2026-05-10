import type { Model3D } from "@ecoctrl/shared";

import type { BusinessObject, PointItem } from "../types";
import { request, fetchRaw, get, post, put, del } from "./request";

// One-time cleanup: remove old mock data from localStorage
localStorage.removeItem("ecoctrl_models_override");
localStorage.removeItem("ecoctrl_mock_objects");

export const modelsApi = {
  list: () => get<Model3D[]>("/models"),

  update: (
    id: string,
    data: {
      name: string;
      version: string;
      deviceType: string;
      points?: PointItem[];
      fileUrl?: string | null;
    },
  ) => put<Model3D>(`/models/${id}`, data),

  replaceFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Model3D>(`/models/${id}/file`, { method: "PUT", body: formData });
  },

  upload: (
    file: File | null,
    data: { name: string; version: string; deviceType: string; points?: PointItem[] },
  ) => {
    const formData = new FormData();
    // Append text fields before file so backend can read them first
    // when iterating multipart parts (file stream must be consumed immediately)
    formData.append("name", data.name);
    formData.append("version", data.version);
    formData.append("deviceType", data.deviceType);
    if (data.points?.length) {
      formData.append("points", JSON.stringify(data.points));
    }
    if (file) {
      formData.append("file", file);
    }
    return request<Model3D>("/models", { method: "POST", body: formData });
  },

  delete: (id: string) => del<void>(`/models/${id}`),

  download: async (id: string): Promise<Blob> => {
    const res = await fetchRaw(`/models/${id}/file`, { method: "GET" });
    return res.blob();
  },
};

export const objectsApi = {
  list: () => get<BusinessObject[]>("/objects"),

  create: (data: Omit<BusinessObject, "uuid">) => post<BusinessObject>("/objects", data),

  update: (uuid: string, data: Partial<Omit<BusinessObject, "uuid">>) =>
    put<BusinessObject>(`/objects/${uuid}`, data),

  delete: (uuid: string) => del<void>(`/objects/${uuid}`),
};
