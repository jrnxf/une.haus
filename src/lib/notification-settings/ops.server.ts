import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"

import { db } from "~/db"
import { userNotificationSettings } from "~/db/schema"

import type { UpdateNotificationSettingsInput } from "~/lib/notification-settings/schemas"

type AuthenticatedContext = {
  user: {
    id: number
  }
}

export async function getNotificationSettings({
  context,
}: {
  context: AuthenticatedContext
}) {
  const userId = context.user.id

  let settings = await db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, userId),
  })

  // If no settings exist, create defaults
  if (!settings) {
    const [created] = await db
      .insert(userNotificationSettings)
      .values({ userId })
      .returning()
    settings = created
  }

  return settings
}

export async function updateNotificationSettings({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: UpdateNotificationSettingsInput
}) {
  const userId = context.user.id

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
    .returning()

  return settings
}
