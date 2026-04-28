import { get, del, patch } from "./request";
import { request } from "./request";

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
};
