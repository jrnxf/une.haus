import "@tanstack/react-start/server-only"
import { and, eq, inArray, sql } from "drizzle-orm"
import { Resend } from "resend"

import GameStartReminderTemplate from "../../../emails/game-start-reminder"
import { db } from "~/db"
import {
  emailRemindersSent,
  riuSets,
  rius,
  userNotificationSettings,
  users,
} from "~/db/schema"
import { env } from "~/lib/env"
import { hoursUntilNextRotation } from "~/lib/games/rius/lifecycle"
import { logger } from "~/lib/logger"
import { signUnsubscribe } from "~/lib/notification-settings/unsubscribe-token"
import { TASK_NAMES } from "~/lib/tasks/constants"

const resendClient = new Resend(env.RESEND_API_KEY)

// Resend rate-limits bursts, so reminders go out in bounded batches rather than
// all at once.
const SEND_CHUNK_SIZE = 10

// Reminder timing derives from the single rotation cadence. `now` is injectable
// so tests can pin a deterministic instant; production callers use the real
// clock.
export const getHoursUntilNextRotation = hoursUntilNextRotation

export async function sendGameStartReminders(now: Date = new Date()) {
  const task = TASK_NAMES.NOTIFICATIONS_GAME_START_REMINDERS
  logger.info("game-start-reminders started", { task })

  // Get the upcoming RIU
  const upcomingRiu = await db.query.rius.findFirst({
    where: eq(rius.status, "upcoming"),
  })

  if (!upcomingRiu) {
    logger.info("no upcoming riu", { task })
    return {
      success: true,
      sent: 0,
      skipped: 0,
      errors: 0,
      hoursUntilStart: 0,
    }
  }

  const hoursUntilStart = getHoursUntilNextRotation(now)

  // Get set and rider counts for the upcoming round
  const setStats = await db
    .select({
      setCount: sql<number>`count(*)`,
      riderCount: sql<number>`count(distinct ${riuSets.userId})`,
    })
    .from(riuSets)
    .where(eq(riuSets.riuId, upcomingRiu.id))

  const { setCount, riderCount } = setStats[0] ?? {
    setCount: 0,
    riderCount: 0,
  }

  // Find users who want reminders at this hour threshold
  // and haven't been sent a reminder for this RIU yet
  const eligibleUsers = await db
    .select({
      userId: userNotificationSettings.userId,
      email: users.email,
      name: users.name,
      hoursBefore: userNotificationSettings.gameStartReminderHoursBefore,
    })
    .from(userNotificationSettings)
    .innerJoin(users, eq(users.id, userNotificationSettings.userId))
    .where(
      and(
        eq(userNotificationSettings.gameStartReminderEnabled, true),
        eq(userNotificationSettings.emailUnsubscribedAll, false),
      ),
    )

  // Filter to users whose reminder time matches current hours until start
  const usersToNotify = eligibleUsers.filter((user) => {
    const targetHours = user.hoursBefore ?? 24
    // Allow a 1-hour window for the check
    return hoursUntilStart <= targetHours && hoursUntilStart > targetHours - 1
  })

  logger.info("computed eligible users", {
    task,
    hoursUntilStart,
    potentialUsers: usersToNotify.length,
  })

  // Users who already have a reminder row for this RIU are resolved in one
  // query rather than one per user.
  const alreadyRemindedUserIds = new Set<number>()

  if (usersToNotify.length > 0) {
    const existingReminders = await db
      .select({ userId: emailRemindersSent.userId })
      .from(emailRemindersSent)
      .where(
        and(
          eq(emailRemindersSent.reminderType, "game_start"),
          eq(emailRemindersSent.riuId, upcomingRiu.id),
          inArray(
            emailRemindersSent.userId,
            usersToNotify.map((user) => user.userId),
          ),
        ),
      )

    for (const reminder of existingReminders) {
      alreadyRemindedUserIds.add(reminder.userId)
    }
  }

  const pendingUsers = usersToNotify.filter(
    (user) => !alreadyRemindedUserIds.has(user.userId),
  )

  let sentCount = 0
  const skippedCount = usersToNotify.length - pendingUsers.length
  let errorCount = 0

  const sendReminder = async (user: (typeof pendingUsers)[number]) => {
    try {
      const { error } = await resendClient.emails.send({
        from: "une.haus <colby@jrnxf.co>",
        to: [user.email],
        subject: `new RIU round starts in ${hoursUntilStart} ${hoursUntilStart === 1 ? "hour" : "hours"}`,
        react: GameStartReminderTemplate({
          userName: user.name,
          hoursUntilStart,
          riderCount: Number(riderCount),
          setCount: Number(setCount),
          viewRoundUrl: `https://une.haus/games/rius/upcoming`,
          addSetUrl: `https://une.haus/games/rius/upcoming/join`,
          unsubscribeReminderUrl: `https://une.haus/api/unsubscribe?type=game_start&userId=${user.userId}&token=${signUnsubscribe(user.userId, "game_start")}`,
          unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}&token=${signUnsubscribe(user.userId, "all")}`,
        }),
      })

      if (error) {
        logger.error("reminder send failed", {
          task,
          userId: user.userId,
          err: error,
        })
        return "error" as const
      }

      // Record that we sent this reminder
      await db.insert(emailRemindersSent).values({
        userId: user.userId,
        reminderType: "game_start",
        riuId: upcomingRiu.id,
      })

      logger.info("reminder sent", { task, userId: user.userId })
      return "sent" as const
    } catch (error) {
      logger.error("reminder processing error", {
        task,
        userId: user.userId,
        err: error,
      })
      return "error" as const
    }
  }

  for (let index = 0; index < pendingUsers.length; index += SEND_CHUNK_SIZE) {
    const outcomes = await Promise.all(
      pendingUsers.slice(index, index + SEND_CHUNK_SIZE).map(sendReminder),
    )

    for (const outcome of outcomes) {
      if (outcome === "sent") {
        sentCount++
      } else {
        errorCount++
      }
    }
  }

  logger.info("game-start-reminders complete", {
    task,
    sent: sentCount,
    skipped: skippedCount,
    errors: errorCount,
  })

  return {
    success: true,
    sent: sentCount,
    skipped: skippedCount,
    errors: errorCount,
    hoursUntilStart,
  }
}
