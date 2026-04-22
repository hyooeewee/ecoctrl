import { z } from "zod";

export const LoginBodySchema = z.object({
  username: z.string(),
  password: z.string(),
  remember: z.boolean().optional(),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    avatarUrl: z.string().nullable(),
    role: z.string(),
  }),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
