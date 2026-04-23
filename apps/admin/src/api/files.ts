import { get, del } from "./request";
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
  delete: (id: string) => del<void>(`/files/${id}`),
};
