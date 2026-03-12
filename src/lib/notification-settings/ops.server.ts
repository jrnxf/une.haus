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

type UnsubscribeType = "all" | "digest" | "game_start"

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

export async function unsubscribe({
  type,
  userId,
}: {
  type: UnsubscribeType
  userId: number
}) {
  const updates: Partial<{
    emailDigestFrequency: "off" | "weekly" | "monthly"
    emailUnsubscribedAll: boolean
    gameStartReminderEnabled: boolean
  }> = {}

  switch (type) {
    case "digest": {
      updates.emailDigestFrequency = "off"
      break
    }
    case "game_start": {
      updates.gameStartReminderEnabled = false
      break
    }
    case "all": {
      updates.emailUnsubscribedAll = true
      break
    }
  }

  await db
    .update(userNotificationSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(userNotificationSettings.userId, userId))
}
