import { z } from "zod";

import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "~/db/schema";

export const listNotificationsSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(1).max(50).default(20),
  unreadOnly: z.boolean().default(false),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

export const markReadSchema = z.object({
  notificationId: z.number().positive().int(),
});

export const markGroupReadSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  entityType: z.enum(NOTIFICATION_ENTITY_TYPES),
  entityId: z.number().positive().int(),
});

export const markAllReadSchema = z.object({});

export const deleteNotificationSchema = z.object({
  notificationId: z.number().positive().int(),
});

// Internal schema for creating notifications
export const createNotificationSchema = z.object({
  userId: z.number().positive().int(),
  actorId: z.number().positive().int().optional(),
  type: z.enum(NOTIFICATION_TYPES),
  entityType: z.enum(NOTIFICATION_ENTITY_TYPES),
  entityId: z.number().positive().int(),
  data: z
    .object({
      actorName: z.string().optional(),
      actorAvatarId: z.string().nullable().optional(),
      entityTitle: z.string().optional(),
      entityPreview: z.string().optional(),
    })
    .optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
