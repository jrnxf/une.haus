import { z } from "zod";
import { USER_DISCIPLINES } from "~/db/schema";

export const listUsersSchema = z.object({
  cursor: z.number().nullish(),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).optional(),
  limit: z.number().min(25).max(50).default(25),
  q: z.string().optional(),
});

export const getUserSchema = z.object({
  userId: z.coerce.number(),
});

export const getUserFollowsSchema = z.object({
  userId: z.coerce.number(),
});

export const followUserSchema = z.object({
  userId: z.coerce.number(),
});

export const unfollowUserSchema = z.object({
  userId: z.coerce.number(),
});

export const updateUserSchema = z.object({
  avatarUrl: z.string().nullable(),
  bio: z.string().trim().nullable(),
  email: z.string().trim().email(),
  location: z
    .object({
      countryCode: z.string().min(1),
      countryName: z.string().min(1),
      label: z.string().min(1),
      lat: z.number(),
      lng: z.number(),
    })
    .optional()
    .nullable(),
  name: z.string().trim().min(1, { message: "Required" }),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).optional().nullable(),
  socials: z
    .object({
      facebook: z.string().url().or(z.literal("")).optional().nullable(),
      tiktok: z.string().url().or(z.literal("")).optional().nullable(),
      twitter: z.string().url().or(z.literal("")).optional().nullable(),
      youtube: z.string().url().or(z.literal("")).optional().nullable(),
      instagram: z.string().url().or(z.literal("")).optional().nullable(),
      spotify: z.string().url().or(z.literal("")).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type UpdateUserArgs = z.infer<typeof updateUserSchema>;
