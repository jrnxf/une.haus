import { z } from "zod"

export const updateNotificationSettingsSchema = z.object({
  // In-app notification toggles
  likesEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
  followsEnabled: z.boolean().optional(),
  newContentEnabled: z.boolean().optional(),
  mentionsEnabled: z.boolean().optional(),
  // Email digest preferences
  emailDigestFrequency: z.enum(["off", "weekly", "monthly"]).optional(),
  emailDigestDayOfWeek: z.number().min(0).max(6).optional(),
  emailDigestDayOfMonth: z.number().min(1).max(28).optional(),
  emailDigestHourUtc: z.number().min(0).max(23).optional(),
  // Game start reminder preferences
  gameStartReminderEnabled: z.boolean().optional(),
  gameStartReminderHoursBefore: z.number().min(1).max(72).optional(),
  // Pre-game trick reminder preferences
  preTrickReminderEnabled: z.boolean().optional(),
  preTrickReminderDaysBefore: z.number().min(1).max(7).optional(),
  // Global email unsubscribe
  emailUnsubscribedAll: z.boolean().optional(),
})

export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>
