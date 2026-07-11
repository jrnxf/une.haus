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

const { default: gameStartRemindersTask, getHoursUntilNextRotation } =
  await import("../../../server/tasks/notifications/game-start-reminders")

import { and, eq } from "drizzle-orm"

import { db } from "~/db"
import { emailRemindersSent, rius, userNotificationSettings } from "~/db/schema"
import { seedUser, truncatePublicTables } from "~/testing/integration"

// Pin a deterministic clock so the window math doesn't depend on the wall clock.
// 2026-06-21 is a Sunday at 00:00 UTC, i.e. exactly 24h before the next Monday
// rotation — comfortably inside the realistic 1..72h reminder range.
const NOW = new Date("2026-06-21T00:00:00.000Z")

const taskEvent: TaskEvent = {
  name: "notifications:game-start-reminders",
  payload: { nowMs: NOW.getTime() },
  context: {},
}

function matchesWindow(hoursUntilStart: number, hoursBefore: number) {
  const targetHours = hoursBefore
  return hoursUntilStart <= targetHours && hoursUntilStart > targetHours - 1
}

async function runReminders() {
  const { result } = await gameStartRemindersTask.run(taskEvent)
  if (!result) throw new Error("game-start-reminders task returned no result")
  return result
}

async function seedUpcomingRiu() {
  const [riu] = await db.insert(rius).values({ status: "upcoming" }).returning()
  return riu
}

async function seedReminderUser(
  overrides: Partial<typeof userNotificationSettings.$inferInsert> = {},
) {
  const user = await seedUser()
  await db.insert(userNotificationSettings).values({
    userId: user.id,
    gameStartReminderEnabled: true,
    emailUnsubscribedAll: false,
    gameStartReminderHoursBefore: 24,
    ...overrides,
  })
  return user
}

// Clamp a candidate hoursBefore into the schema-realistic 1..72 range.
function clamp(value: number) {
  return Math.min(72, Math.max(1, value))
}

beforeEach(async () => {
  sendMock.mockClear()
  await truncatePublicTables()
})

describe("game-start-reminders task", () => {
  it("no upcoming riu: sends nothing", async () => {
    await seedReminderUser()

    const result = await runReminders()

    expect(sendMock).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })

  it("matching window: sends one reminder and records it", async () => {
    const riu = await seedUpcomingRiu()
    const hoursUntilStart = getHoursUntilNextRotation(NOW)
    const hoursBefore = clamp(hoursUntilStart)
    // Guard: chosen value must actually satisfy the task's filter formula.
    expect(matchesWindow(hoursUntilStart, hoursBefore)).toBe(true)

    const user = await seedReminderUser({
      gameStartReminderHoursBefore: hoursBefore,
    })

    const result = await runReminders()

    expect(sendMock).toHaveBeenCalledTimes(1)
    const sendArg = sendMock.mock.calls[0]?.[0]
    expect(sendArg?.to).toEqual([user.email])
    expect(result.sent).toBe(1)

    // The email's CTA links must point at routes that actually exist —
    // /games/rius/upcoming/join is the set-submission page.
    const emailBody = JSON.stringify(sendArg)
    expect(emailBody).toContain("https://une.haus/games/rius/upcoming/join")
    expect(emailBody).toContain("https://une.haus/games/rius/upcoming")
    expect(emailBody).not.toContain("sets/create")

    const sentRows = await db.query.emailRemindersSent.findMany({
      where: and(
        eq(emailRemindersSent.userId, user.id),
        eq(emailRemindersSent.reminderType, "game_start"),
        eq(emailRemindersSent.riuId, riu.id),
      ),
    })
    expect(sentRows).toHaveLength(1)
  })

  it("dedup: a second run skips the already-reminded user", async () => {
    await seedUpcomingRiu()
    const hoursUntilStart = getHoursUntilNextRotation(NOW)
    const hoursBefore = clamp(hoursUntilStart)
    expect(matchesWindow(hoursUntilStart, hoursBefore)).toBe(true)

    await seedReminderUser({ gameStartReminderHoursBefore: hoursBefore })

    const first = await runReminders()
    expect(first.sent).toBe(1)
    expect(sendMock).toHaveBeenCalledTimes(1)

    sendMock.mockClear()

    const second = await runReminders()
    expect(sendMock).not.toHaveBeenCalled()
    expect(second.sent).toBe(0)
    expect(second.skipped).toBe(1)
  })

  it("non-matching window: user whose hoursBefore fails the filter gets nothing", async () => {
    await seedUpcomingRiu()
    const hoursUntilStart = getHoursUntilNextRotation(NOW)
    // Pick a value far enough above hoursUntilStart that the filter fails.
    const hoursBefore = clamp(hoursUntilStart + 5)
    // Guard: chosen value must NOT satisfy the filter formula.
    expect(matchesWindow(hoursUntilStart, hoursBefore)).toBe(false)

    await seedReminderUser({ gameStartReminderHoursBefore: hoursBefore })

    const result = await runReminders()

    expect(sendMock).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })

  it("unsubscribed-all: matching hours but globally unsubscribed gets nothing", async () => {
    await seedUpcomingRiu()
    const hoursUntilStart = getHoursUntilNextRotation(NOW)
    const hoursBefore = clamp(hoursUntilStart)
    expect(matchesWindow(hoursUntilStart, hoursBefore)).toBe(true)

    await seedReminderUser({
      gameStartReminderHoursBefore: hoursBefore,
      emailUnsubscribedAll: true,
    })

    const result = await runReminders()

    expect(sendMock).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })
})
