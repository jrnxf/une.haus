import { beforeEach, describe, expect, it } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/db"
import { userNotificationSettings } from "~/db/schema"
import {
  getNotificationSettings,
  unsubscribe,
} from "~/lib/notification-settings/ops.server"
import { seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("unsubscribe integration", () => {
  it("unsubscribe type=digest sets emailDigestFrequency to off", async () => {
    const user = await seedUser({ name: "Test User" })

    // Create settings with digest enabled
    await getNotificationSettings({ context: { user: { id: user.id } } })
    await db
      .update(userNotificationSettings)
      .set({ emailDigestFrequency: "weekly" })
      .where(eq(userNotificationSettings.userId, user.id))

    await unsubscribe({ type: "digest", userId: user.id })

    const settings = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, user.id),
    })

    expect(settings?.emailDigestFrequency).toBe("off")
  })

  it("unsubscribe type=game_start disables game start reminders", async () => {
    const user = await seedUser({ name: "Test User" })

    // Create settings with game start enabled
    await getNotificationSettings({ context: { user: { id: user.id } } })
    await db
      .update(userNotificationSettings)
      .set({ gameStartReminderEnabled: true })
      .where(eq(userNotificationSettings.userId, user.id))

    await unsubscribe({ type: "game_start", userId: user.id })

    const settings = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, user.id),
    })

    expect(settings?.gameStartReminderEnabled).toBe(false)
  })

  it("unsubscribe type=all sets emailUnsubscribedAll to true", async () => {
    const user = await seedUser({ name: "Test User" })

    // Create settings
    await getNotificationSettings({ context: { user: { id: user.id } } })

    await unsubscribe({ type: "all", userId: user.id })

    const settings = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, user.id),
    })

    expect(settings?.emailUnsubscribedAll).toBe(true)
  })

  it("unsubscribe does not affect other settings", async () => {
    const user = await seedUser({ name: "Test User" })

    // Create settings with multiple things enabled
    await getNotificationSettings({ context: { user: { id: user.id } } })
    await db
      .update(userNotificationSettings)
      .set({
        emailDigestFrequency: "weekly",
        gameStartReminderEnabled: true,
      })
      .where(eq(userNotificationSettings.userId, user.id))

    // Unsubscribe only from digest
    await unsubscribe({ type: "digest", userId: user.id })

    const settings = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, user.id),
    })

    expect(settings?.emailDigestFrequency).toBe("off")
    expect(settings?.gameStartReminderEnabled).toBe(true)
    expect(settings?.emailUnsubscribedAll).toBe(false)
  })
})
