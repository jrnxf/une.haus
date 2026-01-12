import { z } from "zod";

export const updateNotificationSettingsSchema = z.object({
  likesEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
  followsEnabled: z.boolean().optional(),
  newContentEnabled: z.boolean().optional(),
});

export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>;
