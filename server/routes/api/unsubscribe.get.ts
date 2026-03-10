import { eq } from "drizzle-orm"
import { defineEventHandler, getQuery, sendRedirect } from "h3"

import { db } from "~/db"
import { userNotificationSettings } from "~/db/schema"
import { env } from "~/lib/env"

const BASE_URL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : env.VITE_APP_URL

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type
  const userId = query.userId

  if (typeof type !== "string" || typeof userId !== "string") {
    return new Response("Missing required parameters", { status: 400 })
  }

  const userIdNum = Number(userId)
  if (Number.isNaN(userIdNum)) {
    return new Response("Invalid userId", { status: 400 })
  }

  try {
    const updates: Partial<{
      emailDigestFrequency: "off" | "weekly" | "monthly"
      gameStartReminderEnabled: boolean
      preTrickReminderEnabled: boolean
      emailUnsubscribedAll: boolean
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
      case "pre_trick": {
        updates.preTrickReminderEnabled = false
        break
      }
      case "all": {
        updates.emailUnsubscribedAll = true
        break
      }
      default: {
        return new Response("Invalid unsubscribe type", { status: 400 })
      }
    }

    await db
      .update(userNotificationSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userNotificationSettings.userId, userIdNum))

    return sendRedirect(
      event,
      `${BASE_URL}/notifications/settings?unsubscribed=${type}`,
      302,
    )
  } catch (error) {
    console.error("[unsubscribe] Error:", error)
    return new Response("Failed to unsubscribe", { status: 500 })
  }
})
