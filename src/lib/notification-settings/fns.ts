import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { eq } from "drizzle-orm";

import { db } from "~/db";
import { userNotificationSettings } from "~/db/schema";
import { authMiddleware } from "~/lib/middleware";
import { updateNotificationSettingsSchema } from "~/lib/notification-settings/schemas";

export const getNotificationSettingsServerFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    let settings = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, userId),
    });

    // If no settings exist, create defaults
    if (!settings) {
      const [created] = await db
        .insert(userNotificationSettings)
        .values({ userId })
        .returning();
      settings = created;
    }

    return settings;
  });

export const updateNotificationSettingsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateNotificationSettingsSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    // Upsert settings
    const [settings] = await db
      .insert(userNotificationSettings)
      .values({
        userId,
        ...input,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userNotificationSettings.userId,
        set: {
          ...input,
          updatedAt: new Date(),
        },
      })
      .returning();

    return settings;
  });
