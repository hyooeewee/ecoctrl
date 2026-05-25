import { get, post, del } from "./request";

export interface NodeDefinition {
  id: string;
  name: string;
  version: string;
  category: "trigger" | "action" | "condition";
  description?: string;
  icon?: string;
  schema: Record<string, unknown>;
}

export interface NodeVersionInfo {
  version: string;
  name: string;
  category: string;
}

export interface NodeDetail {
  id: string;
  versions: NodeVersionInfo[];
}

export const nodesApi = {
  getAll: async (): Promise<NodeDefinition[]> => {
    return get("/nodes");
  },

  getById: async (id: string): Promise<NodeDetail> => {
    return get(`/nodes/${id}`);
  },

  install: async (file: File): Promise<{ id: string; version: string; name: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return post("/nodes/install", formData, {
      headers: {},
    });
  },

  uninstall: async (id: string, version: string): Promise<void> => {
    return del(`/api/nodes/${id}/${version}`);
  },

  reload: async (): Promise<{ message: string }> => {
    return post("/nodes/reload", {});
  },
};
