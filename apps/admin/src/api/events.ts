import { post } from "./request";

export interface SseTokenResponse {
  token: string;
  expiresIn: number;
}

export const eventsApi = {
  getToken: async (): Promise<SseTokenResponse> => {
    return post("/events/token");
  },
};
