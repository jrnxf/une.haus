import { beforeEach, describe, expect, it, mock } from "bun:test"

import type { TaskEvent } from "nitro/types"

const sendMock = mock((_payload: { to: string[] }) =>
  Promise.resolve({ data: { id: "email-id" }, error: null }),
)

mock.module("resend", () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

const { default: sendDigestsTask } =
  await import("../../../server/tasks/notifications/send-digests")

import { and, eq } from "drizzle-orm"

import { db } from "~/db"
import { notifications, userNotificationSettings } from "~/db/schema"
import { seedUser, truncatePublicTables } from "~/testing/integration"

const taskEvent: TaskEvent = {
  name: "notifications:send-digests",
  payload: {},
  context: {},
}

async function runDigests() {
  const { result } = await sendDigestsTask.run(taskEvent)
  if (!result) throw new Error("send-digests task returned no result")
  return result
}

const now = new Date()

async function seedWeeklyEligibleUser(
  overrides: Partial<typeof userNotificationSettings.$inferInsert> = {},
) {
  const user = await seedUser()
  await db.insert(userNotificationSettings).values({
    userId: user.id,
    emailDigestFrequency: "weekly",
    emailUnsubscribedAll: false,
    emailDigestHourUtc: now.getUTCHours(),
    emailDigestDayOfWeek: now.getUTCDay(),
    ...overrides,
  })
  return user
}

async function seedNotification(
  userId: number,
  overrides: Partial<typeof notifications.$inferInsert> = {},
) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId,
      type: "like",
      entityType: "post",
      entityId: 1,
      ...overrides,
    })
    .returning()
  return row
}

beforeEach(async () => {
  sendMock.mockClear()
  await truncatePublicTables()
})

describe("send-digests task", () => {
  it("weekly happy path: sends one email and marks notifications emailed", async () => {
    const user = await seedWeeklyEligibleUser()
    const n1 = await seedNotification(user.id)
    const n2 = await seedNotification(user.id)

    const result = await runDigests()

    expect(sendMock).toHaveBeenCalledTimes(1)
    const sendArg = sendMock.mock.calls[0]?.[0]
    expect(sendArg?.to).toEqual([user.email])
    expect(result.sent).toBe(1)

    const rows = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
    })
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.emailedAt).not.toBeNull()
    }
    expect(rows.map((r) => r.id).toSorted()).toEqual([n1.id, n2.id].toSorted())
  })

  it("dedup across runs: second run sends nothing", async () => {
    const user = await seedWeeklyEligibleUser()
    await seedNotification(user.id)
    await seedNotification(user.id)

    const first = await runDigests()
    expect(first.sent).toBe(1)
    expect(sendMock).toHaveBeenCalledTimes(1)

    sendMock.mockClear()

    const second = await runDigests()
    expect(second.sent).toBe(0)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("no notifications: eligible user is skipped", async () => {
    await seedWeeklyEligibleUser()

    const result = await runDigests()

    expect(sendMock).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })

  it("filters: non-eligible users receive no digest", async () => {
    const offUser = await seedWeeklyEligibleUser({
      emailDigestFrequency: "off",
    })
    const unsubUser = await seedWeeklyEligibleUser({
      emailUnsubscribedAll: true,
    })
    const wrongHourUser = await seedWeeklyEligibleUser({
      emailDigestHourUtc: (now.getUTCHours() + 2) % 24,
    })

    await seedNotification(offUser.id)
    await seedNotification(unsubUser.id)
    await seedNotification(wrongHourUser.id)

    const result = await runDigests()

    expect(sendMock).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)

    const rows = await db.query.notifications.findMany()
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row.emailedAt).toBeNull()
    }
  })

  it("window bound: notification older than the weekly window is excluded", async () => {
    const user = await seedWeeklyEligibleUser()
    const eightDaysAgo = new Date(now)
    eightDaysAgo.setUTCDate(eightDaysAgo.getUTCDate() - 8)
    const old = await seedNotification(user.id, { createdAt: eightDaysAgo })

    const result = await runDigests()

    expect(sendMock).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)

    const [row] = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, user.id),
        eq(notifications.id, old.id),
      ),
    })
    expect(row?.emailedAt).toBeNull()
  })
})
