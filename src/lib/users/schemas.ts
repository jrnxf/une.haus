import { z } from "zod";
import { USER_DISCIPLINES } from "~/db/schema";

export const getUserSchema = z.object({
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
      formattedAddress: z.string().min(1),
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
