import { get, del, patch } from "./request";
import { request } from "./request";
import { API_PREFIX } from "../lib/env";

export interface FileMeta {
  id: string;
  name: string;
  fileUrl: string;
}

export const filesApi = {
  list: () => get<FileMeta[]>("/files"),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<FileMeta>("/files", { method: "POST", body: formData });
  },
  update: (id: string, name: string) => patch<FileMeta>(`/files/${id}`, { name }),
  delete: (id: string) => del<void>(`/files/${id}`),
  getUrl: (id: string, preview: boolean = false) =>
    `${API_PREFIX}/files/${id}${preview ? "/preview" : ""}`,
};
