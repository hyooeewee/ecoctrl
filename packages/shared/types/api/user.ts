import { z } from "zod";

// User account status
export const USER_STATUS_LIST = ["online", "offline", "disabled", "busy"] as const;
export const UserStatusSchema = z.enum(USER_STATUS_LIST);
export type UserStatus = z.infer<typeof UserStatusSchema>;

// User role
export const USER_ROLE_LIST = ["super_admin", "admin", "operator", "analyst", "viewer"] as const;
export const UserRoleSchema = z.enum(USER_ROLE_LIST);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Modifiable user fields
export const UserBaseSchema = z.object({
  username: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  avatarUrl: z.string().nullable(),
  status: UserStatusSchema,
});
export type UserBase = z.infer<typeof UserBaseSchema>;

// Full user record returned by API
export const UserSchema = UserBaseSchema.extend({
  id: z.string(),
  lastLogin: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

// Create user: required email + password, optional rest
export const UserCreateBodySchema = z
  .object({
    email: z.string(),
    password: z.string(),
  })
  .merge(UserBaseSchema.partial().omit({ email: true }));
export type UserCreateBody = z.infer<typeof UserCreateBodySchema>;

// Update user: id comes from URL path
export const UserUpdateBodySchema = UserBaseSchema.partial().extend({
  password: z.string().optional(),
});
export type UserUpdateBody = z.infer<typeof UserUpdateBodySchema>;
