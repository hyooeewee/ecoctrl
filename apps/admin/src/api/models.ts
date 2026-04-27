import type { Model3D } from "@ecoctrl/shared";

import type { BusinessObject, PointItem } from "../types";
import { request, fetchRaw, get, del } from "./request";

// Model override mock (merges with backend data until PUT API is ready)
const MODELS_OVERRIDE_KEY = "ecoctrl_models_override";

function getModelOverrides(): Record<
  string,
  { name?: string; version?: string; points?: PointItem[] }
> {
  try {
    return JSON.parse(localStorage.getItem(MODELS_OVERRIDE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setModelOverride(
  id: string,
  data: { name: string; version: string; points?: PointItem[] },
) {
  const overrides = getModelOverrides();
  overrides[id] = data;
  localStorage.setItem(MODELS_OVERRIDE_KEY, JSON.stringify(overrides));
}

export const modelsApi = {
  list: async (): Promise<Model3D[]> => {
    const data = await get<Model3D[]>("/models");
    const overrides = getModelOverrides();
    return data.map((m) => ({ ...m, ...overrides[m.id] }));
  },

  update: async (
    id: string,
    data: { name: string; version: string; points?: PointItem[] },
  ): Promise<Model3D> => {
    try {
      const res = await request<Model3D>(`/models/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setModelOverride(id, data);
      return res;
    } catch {
      setModelOverride(id, data);
      // Return merged object from overrides
      const overrides = getModelOverrides();
      return { id, ...overrides[id] } as Model3D;
    }
  },

  upload: (file: File, data: { name: string; version: string; points?: PointItem[] }) => {
    const formData = new FormData();
    // Append text fields before file so backend can read them first
    // when iterating multipart parts (file stream must be consumed immediately)
    formData.append("name", data.name);
    formData.append("version", data.version);
    if (data.points?.length) {
      formData.append("points", JSON.stringify(data.points));
    }
    formData.append("file", file);
    return request<Model3D>("/models", { method: "POST", body: formData });
  },

  delete: (id: string) => del<void>(`/models/${id}`),

  download: async (id: string): Promise<Blob> => {
    const res = await fetchRaw(`/models/${id}/file`, { method: "GET" });
    return res.blob();
  },
};

// Mock objects API (persisted in localStorage until backend is ready)
const OBJECTS_STORAGE_KEY = "ecoctrl_mock_objects";

function getMockObjects(): BusinessObject[] {
  try {
    const raw = localStorage.getItem(OBJECTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BusinessObject[]) : [];
  } catch {
    return [];
  }
}

function saveMockObjects(objects: BusinessObject[]) {
  localStorage.setItem(OBJECTS_STORAGE_KEY, JSON.stringify(objects));
}

export const objectsApi = {
  list: async (): Promise<BusinessObject[]> => {
    return getMockObjects();
  },

  create: async (data: BusinessObject): Promise<BusinessObject> => {
    const objects = getMockObjects();
    const exists = objects.find((o) => o.id === data.id);
    if (exists) throw new Error(`对象ID "${data.id}" 已存在`);
    objects.push(data);
    saveMockObjects(objects);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const objects = getMockObjects().filter((o) => o.id !== id);
    saveMockObjects(objects);
  },
};
