import { get, post, put, del } from "./request";
import type { User } from "@ecoctrl/shared";

export const usersApi = {
  list: () => get<User[]>("/api/users"),
  create: (data: { username: string; email: string; password: string; role: string }) =>
    post<User>("/api/users", data),
  update: (id: string, data: Partial<User>) => put<User>(`/api/users/${id}`, data),
  delete: (id: string) => del<void>(`/api/users/${id}`),
};
