import { z } from "zod"

import { USER_DISCIPLINES } from "~/db/schema"

/** Parses comma-separated string or array into array */
const commaArrayOf = <T extends string>(enumValues: readonly [T, ...T[]]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined
      const arr = typeof val === "string" ? val.split(",").filter(Boolean) : val
      // Validate against enum
      const parsed = z.array(z.enum(enumValues)).safeParse(arr)
      return parsed.success ? parsed.data : undefined
    })

export const listUsersSchema = z.object({
  cursor: z.number().nullish(),
  disciplines: commaArrayOf(USER_DISCIPLINES),
  name: z.string().optional(),

  // it thinks this is a promise .catch lol
  id: z.number().optional().catch(undefined),
})

export const getUserSchema = z.object({
  userId: z.coerce.number(),
})

export const getUserFollowsSchema = z.object({
  userId: z.coerce.number(),
})

export const followUserSchema = z.object({
  userId: z.coerce.number(),
})

export const unfollowUserSchema = z.object({
  userId: z.coerce.number(),
})

export const updateUserSchema = z.object({
  avatarId: z.string().nullable(),
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
})

export type UpdateUserArgs = z.infer<typeof updateUserSchema>

export const ACTIVITY_TYPES = [
  "post",
  "comment",
  "riuSet",
  "riuSubmission",
  "biuSet",
  "trickSubmission",
  "trickSuggestion",
  "trickVideo",
  "utvVideoSuggestion",
  "siuSet",
] as const

export type ActivityTypeFilter = (typeof ACTIVITY_TYPES)[number]

export const getUserActivitySchema = z.object({
  userId: z.coerce.number(),
  cursor: z.string().nullish(),
  limit: z.number().min(1).max(100).default(50),
  /** If true, fetch all activity (ignoring one-year limit) */
  all: z.boolean().optional(),
  /** Filter to a specific activity type */
  type: z.enum(ACTIVITY_TYPES).optional(),
})

export const setShopNotifySchema = z.object({
  notify: z.boolean(),
})
