import type { DataModel } from "@ecoctrl/shared";

import { request, fetchRaw, get, put, del } from "./request";
import { API_PREFIX } from "../lib/env";

// One-time cleanup: remove old mock data from localStorage
localStorage.removeItem("ecoctrl_models_override");
localStorage.removeItem("ecoctrl_mock_objects");

export const modelsApi = {
  list: () => get<DataModel[]>("/models"),

  update: (
    id: string,
    data: {
      name?: string;
      version?: string;
      code?: string;
      fileUrl?: string | null;
    },
  ) => put<DataModel>(`/models/${id}`, data),

  replaceFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<DataModel>(`/models/${id}/file`, { method: "PUT", body: formData });
  },

  upload: (file: File | null, data: { name: string; version: string; code: string }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("version", data.version);
    formData.append("code", data.code);
    if (file) {
      formData.append("file", file);
    }
    return request<DataModel>("/models", { method: "POST", body: formData });
  },

  delete: (id: string) => del<void>(`/models/${id}`),

  download: async (id: string): Promise<Blob> => {
    const res = await fetchRaw(`/models/${id}/file`, { method: "GET" });
    return res.blob();
  },

  importPoints: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{
      createdModels: number;
      createdObjects: number;
      createdPoints: number;
      skippedPoints: number;
      devices: string[];
    }>("/models/import-points", { method: "POST", body: formData });
  },

  getFileUrl: (id: string) => `${API_PREFIX}/models/${id}/file`,
};
