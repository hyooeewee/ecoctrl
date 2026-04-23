import { request, fetchRaw, get, del } from "./request";
import type { Model3D } from "../types";

export const modelsApi = {
  list: () => get<Model3D[]>("/models"),

  upload: (file: File, data: { name: string; version: string }) => {
    const formData = new FormData();
    // Append text fields before file so backend can read them first
    // when iterating multipart parts (file stream must be consumed immediately)
    formData.append("name", data.name);
    formData.append("version", data.version);
    formData.append("file", file);
    return request<Model3D>("/models", { method: "POST", body: formData });
  },

  delete: (id: string) => del<void>(`/models/${id}`),

  download: async (id: string): Promise<Blob> => {
    const res = await fetchRaw(`/models/${id}/file`, { method: "GET" });
    return res.blob();
  },
};
