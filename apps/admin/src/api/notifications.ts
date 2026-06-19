import { get, post, put } from "./request";

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string | null;
}

export const notificationsApi = {
  list: () => get<Notification[]>("/notifications"),

  unreadCount: () => get<{ count: number }>("/notifications/unread-count"),

  markRead: (id: string) => put<Notification>(`/notifications/${id}/read`),

  markReadBatch: (ids: string[]) => post<{ marked: number }>("/notifications/mark-read", { ids }),
};
