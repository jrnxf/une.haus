import "@tanstack/react-start/server-only"
import { and, eq, isNull, ne, sql } from "drizzle-orm"
import { Resend } from "resend"

import GameStartReminderTemplate from "../../../emails/game-start-reminder"
import NotificationDigestTemplate from "../../../emails/notification-digest"
import { db } from "~/db"
import {
  emailRemindersSent,
  notifications,
  riuSets,
  rius,
  userNotificationSettings,
  users,
} from "~/db/schema"
import { env } from "~/lib/env"

const resendClient = new Resend(env.RESEND_API_KEY)

export async function sendDigests() {
  console.log("[notifications:send-digests] Starting digest send...")

  const now = new Date()
  const currentHour = now.getUTCHours()
  const currentDay = now.getUTCDay()
  const currentDayOfMonth = now.getUTCDate()

  const eligibleUsers = await db
    .select({
      userId: userNotificationSettings.userId,
      email: users.email,
      name: users.name,
      frequency: userNotificationSettings.emailDigestFrequency,
    })
    .from(userNotificationSettings)
    .innerJoin(users, eq(users.id, userNotificationSettings.userId))
    .where(
      and(
        ne(userNotificationSettings.emailDigestFrequency, "off"),
        eq(userNotificationSettings.emailUnsubscribedAll, false),
        eq(userNotificationSettings.emailDigestHourUtc, currentHour),
        sql`
          (
            (
              ${userNotificationSettings.emailDigestFrequency} = 'weekly'
              AND ${userNotificationSettings.emailDigestDayOfWeek} = ${currentDay}
            )
            OR (
              ${userNotificationSettings.emailDigestFrequency} = 'monthly'
              AND ${userNotificationSettings.emailDigestDayOfMonth} = ${currentDayOfMonth}
            )
          )
        `,
      ),
    )

  console.log(
    `[notifications:send-digests] Found ${eligibleUsers.length} eligible users`,
  )

  let sentCount = 0
  let errorCount = 0

  for (const user of eligibleUsers) {
    try {
      const userNotifications = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          entityType: notifications.entityType,
          entityTitle: sql<string>`${notifications.data}->>'entityTitle'`,
          entityPreview: sql<string>`${notifications.data}->>'entityPreview'`,
          actorName: sql<string>`${notifications.data}->>'actorName'`,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.userId),
            isNull(notifications.emailedAt),
          ),
        )
        .orderBy(notifications.createdAt)

      if (userNotifications.length === 0) {
        console.log(
          `[notifications:send-digests] No notifications for user ${user.userId}, skipping`,
        )
        continue
      }

      const likesNotifications = userNotifications.filter(
        (n) => n.type === "like" || n.type === "message_like",
      )
      const commentsNotifications = userNotifications.filter(
        (n) => n.type === "comment",
      )
      const followsNotifications = userNotifications.filter(
        (n) => n.type === "follow",
      )

      type NotificationGroup = {
        type: "likes" | "comments" | "followers"
        count: number
        items: { title: string; preview?: string }[]
      }

      const groups: NotificationGroup[] = []

      if (likesNotifications.length > 0) {
        groups.push({
          type: "likes",
          count: likesNotifications.length,
          items: likesNotifications.map((n) => {
            const title =
              n.entityType === "riuSet" ? undefined : n.entityTitle
            return {
              title:
                n.type === "message_like"
                  ? `Your comment on ${n.entityType} got a like`
                  : title
                    ? `Your ${n.entityType} "${title}" got a like`
                    : `Your ${n.entityType} got a like`,
            }
          }),
        })
      }

      if (commentsNotifications.length > 0) {
        groups.push({
          type: "comments",
          count: commentsNotifications.length,
          items: commentsNotifications.map((n) => ({
            title: n.actorName
              ? `${n.actorName} commented on your ${n.entityType}`
              : `Someone commented on your ${n.entityType}`,
            preview: n.entityPreview ?? undefined,
          })),
        })
      }

      if (followsNotifications.length > 0) {
        groups.push({
          type: "followers",
          count: followsNotifications.length,
          items: followsNotifications.map((n) => ({
            title: n.actorName
              ? `${n.actorName} started following you`
              : "Someone started following you",
          })),
        })
      }

      if (groups.length === 0) {
        continue
      }

      const subject =
        user.frequency === "monthly"
          ? "your month on une.haus"
          : "your week on une.haus"
      const { error } = await resendClient.emails.send({
        from: "une.haus <colby@jrnxf.co>",
        to: [user.email],
        subject,
        react: NotificationDigestTemplate({
          userName: user.name,
          frequency: user.frequency === "monthly" ? "monthly" : "weekly",
          groups,
          unsubscribeDigestUrl: `https://une.haus/api/unsubscribe?type=digest&userId=${user.userId}`,
          unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}`,
          viewNotificationsUrl: `https://une.haus/notifications`,
        }),
      })

      if (error) {
        console.error(
          `[notifications:send-digests] Failed to send to user ${user.userId}:`,
          error,
        )
        errorCount++
        continue
      }

      const notificationIds = userNotifications.map((n) => n.id)
      await db
        .update(notifications)
        .set({ emailedAt: new Date() })
        .where(sql`${notifications.id} = ANY(${notificationIds})`)

      sentCount++
      console.log(
        `[notifications:send-digests] Sent digest to user ${user.userId} with ${userNotifications.length} notifications`,
      )
    } catch (error) {
      console.error(
        `[notifications:send-digests] Error processing user ${user.userId}:`,
        error,
      )
      errorCount++
    }
  }

  console.log(
    `[notifications:send-digests] Complete. Sent: ${sentCount}, Errors: ${errorCount}`,
  )

  return { success: true, sent: sentCount, errors: errorCount }
}

// Calculate hours until next Monday 00:00 UTC
function getHoursUntilNextRotation(): number {
  const now = new Date()
  const nextMonday = new Date(now)

  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)

  const msUntil = nextMonday.getTime() - now.getTime()
  // Math.round (not Math.floor) so the cron tick closest to a UTC hour
  // boundary wins. Math.floor caused emails to fire 1 hour early because
  // the cron fires at :00:01, truncating e.g. 48.99h → 48.
  return Math.round(msUntil / (1000 * 60 * 60))
}

export async function sendGameStartReminders() {
  console.log("[notifications:game-start-reminders] Starting...")

  const upcomingRiu = await db.query.rius.findFirst({
    where: eq(rius.status, "upcoming"),
  })

  if (!upcomingRiu) {
    console.log("[notifications:game-start-reminders] No upcoming RIU found")
    return {
      success: true,
      sent: 0,
      skipped: 0,
      errors: 0,
      hoursUntilStart: 0,
    }
  }

  const hoursUntilStart = getHoursUntilNextRotation()

  const setStats = await db
    .select({
      setCount: sql<number>`count(*)`,
      riderCount: sql<number>`count(distinct ${riuSets.userId})`,
    })
    .from(riuSets)
    .where(eq(riuSets.riuId, upcomingRiu.id))

  const { setCount, riderCount } = setStats[0] ?? { setCount: 0, riderCount: 0 }

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

  const usersToNotify = eligibleUsers.filter((user) => {
    const targetHours = user.hoursBefore ?? 24
    return hoursUntilStart <= targetHours && hoursUntilStart > targetHours - 1
  })

  console.log(
    `[notifications:game-start-reminders] ${hoursUntilStart}h until rotation, ${usersToNotify.length} potential users`,
  )

  let sentCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const user of usersToNotify) {
    try {
      const existingReminder = await db.query.emailRemindersSent.findFirst({
        where: and(
          eq(emailRemindersSent.userId, user.userId),
          eq(emailRemindersSent.reminderType, "game_start"),
          eq(emailRemindersSent.riuId, upcomingRiu.id),
        ),
      })

      if (existingReminder) {
        skippedCount++
        continue
      }

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
          addSetUrl: `https://une.haus/games/rius/upcoming/sets/create`,
          unsubscribeReminderUrl: `https://une.haus/api/unsubscribe?type=game_start&userId=${user.userId}`,
          unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}`,
        }),
      })

      if (error) {
        console.error(
          `[notifications:game-start-reminders] Failed to send to user ${user.userId}:`,
          error,
        )
        errorCount++
        continue
      }

      await db.insert(emailRemindersSent).values({
        userId: user.userId,
        reminderType: "game_start",
        riuId: upcomingRiu.id,
      })

      sentCount++
      console.log(
        `[notifications:game-start-reminders] Sent to user ${user.userId}`,
      )
    } catch (error) {
      console.error(
        `[notifications:game-start-reminders] Error processing user ${user.userId}:`,
        error,
      )
      errorCount++
    }
  }

  console.log(
    `[notifications:game-start-reminders] Complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
  )

  return {
    success: true,
    sent: sentCount,
    skipped: skippedCount,
    errors: errorCount,
    hoursUntilStart,
  }
}
