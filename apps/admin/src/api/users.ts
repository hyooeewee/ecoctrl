import { get, post, del } from "./request";
import { User } from "../types";

export const usersApi = {
  list: () => get<User[]>("/api/users"),
  create: (data: { name: string; email: string; role: string }) => post<User>("/api/users", data),
  delete: (id: string) => del<void>(`/api/users/${id}`),
};
