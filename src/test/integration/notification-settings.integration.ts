import { beforeEach, describe, expect, it } from "bun:test"

import { seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import {
  getNotificationSettingsImpl,
  updateNotificationSettingsImpl,
} from "~/lib/notification-settings/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("notification settings integration", () => {
  it("getNotificationSettings creates and returns the default row when none exists", async () => {
    const user = await seedUser({ name: "Receiver" })

    const settings = await getNotificationSettingsImpl({
      context: {
        user: {
          id: user.id,
        },
      },
    })

    const rows = await db.query.userNotificationSettings.findMany()

    expect(settings).toEqual(
      expect.objectContaining({
        commentsEnabled: true,
        followsEnabled: true,
        likesEnabled: true,
        mentionsEnabled: true,
        newContentEnabled: true,
        userId: user.id,
      }),
    )
    expect(rows).toHaveLength(1)
  })

  it("updateNotificationSettings inserts on first write and updates on subsequent writes", async () => {
    const user = await seedUser({ name: "Receiver" })

    const inserted = await updateNotificationSettingsImpl({
      context: {
        user: {
          id: user.id,
        },
      },
      data: {
        emailDigestEnabled: true,
        emailDigestFrequency: "daily",
        likesEnabled: false,
      },
    })

    const updated = await updateNotificationSettingsImpl({
      context: {
        user: {
          id: user.id,
        },
      },
      data: {
        emailDigestHourUtc: 17,
        likesEnabled: true,
        mentionsEnabled: false,
      },
    })

    const rows = await db.query.userNotificationSettings.findMany()

    expect(inserted).toEqual(
      expect.objectContaining({
        emailDigestEnabled: true,
        emailDigestFrequency: "daily",
        likesEnabled: false,
        userId: user.id,
      }),
    )
    expect(updated).toEqual(
      expect.objectContaining({
        emailDigestEnabled: true,
        emailDigestFrequency: "daily",
        emailDigestHourUtc: 17,
        likesEnabled: true,
        mentionsEnabled: false,
        userId: user.id,
      }),
    )
    expect(rows).toHaveLength(1)
  })
})
