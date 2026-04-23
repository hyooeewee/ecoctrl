import { get, post, put, del, request } from "./request";
import type { User } from "@ecoctrl/shared";

export const usersApi = {
  list: () => get<User[]>("/users"),
  create: (data: { username: string; email: string; password: string; role: string }) =>
    post<User>("/users", data),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    put<User>(`/users/${id}`, data),
  delete: (id: string) => del<void>(`/users/${id}`),
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ avatarUrl: string }>(`/users/${id}/avatar`, {
      method: "POST",
      body: formData,
    });
  },
};
