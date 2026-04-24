import { get, post, put, del } from "./request";
import type { UserPreferences } from "@ecoctrl/shared";

export const preferencesApi = {
  get: (userId: string) => get<UserPreferences>(`/users/${userId}/preferences`),
  create: (userId: string, data: UserPreferences) =>
    post<UserPreferences>(`/users/${userId}/preferences`, data),
  update: (userId: string, data: Partial<UserPreferences>) =>
    put<UserPreferences>(`/users/${userId}/preferences`, data),
  delete: (userId: string) => del<void>(`/users/${userId}/preferences`),
};
