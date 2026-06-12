import { and, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm"
import { defineTask } from "nitro/task"
import { Resend } from "resend"

import NotificationDigestTemplate from "../../../emails/notification-digest"
import { db } from "~/db"
import { notifications, userNotificationSettings, users } from "~/db/schema"
import { env } from "~/lib/env"
import { logger } from "~/lib/logger"
import { signUnsubscribe } from "~/lib/notification-settings/unsubscribe-token"
import { TASK_NAMES } from "~/lib/tasks/constants"

const resendClient = new Resend(env.RESEND_API_KEY)

export default defineTask({
  meta: {
    name: TASK_NAMES.NOTIFICATIONS_SEND_DIGESTS,
    description: "Send notification digest emails to opted-in users",
  },
  async run() {
    const task = TASK_NAMES.NOTIFICATIONS_SEND_DIGESTS
    logger.info("send-digests started", { task })

    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentDay = now.getUTCDay()
    const currentDayOfMonth = now.getUTCDate()

    // Find users who should receive a digest now
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

    logger.info("found eligible users", {
      task,
      eligibleUsers: eligibleUsers.length,
    })

    let sentCount = 0
    let errorCount = 0

    for (const user of eligibleUsers) {
      try {
        const windowStart = new Date(now)
        if (user.frequency === "monthly") {
          windowStart.setUTCMonth(windowStart.getUTCMonth() - 1)
        } else {
          windowStart.setUTCDate(windowStart.getUTCDate() - 7)
        }

        // Get unemailed notifications from within the digest window
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
              gte(notifications.createdAt, windowStart),
            ),
          )
          .orderBy(notifications.createdAt)

        if (userNotifications.length === 0) {
          logger.debug("no notifications for user, skipping", {
            task,
            userId: user.userId,
          })
          continue
        }

        // Group notifications by type
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
              // Never show riuSet titles in digests — sets are secret until the game goes active
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

        // Send email
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
            unsubscribeDigestUrl: `https://une.haus/api/unsubscribe?type=digest&userId=${user.userId}&token=${signUnsubscribe(user.userId, "digest")}`,
            unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}&token=${signUnsubscribe(user.userId, "all")}`,
            viewNotificationsUrl: `https://une.haus/notifications`,
          }),
        })

        if (error) {
          logger.error("digest send failed", {
            task,
            userId: user.userId,
            err: error,
          })
          errorCount++
          continue
        }

        // Mark notifications as emailed
        const notificationIds = userNotifications.map((n) => n.id)
        await db
          .update(notifications)
          .set({ emailedAt: new Date() })
          .where(inArray(notifications.id, notificationIds))

        sentCount++
        logger.info("digest sent", {
          task,
          userId: user.userId,
          notifications: userNotifications.length,
        })
      } catch (error) {
        logger.error("digest processing error", {
          task,
          userId: user.userId,
          err: error,
        })
        errorCount++
      }
    }

    logger.info("send-digests complete", {
      task,
      sent: sentCount,
      errors: errorCount,
    })

    return {
      result: {
        success: true,
        sent: sentCount,
        errors: errorCount,
      },
    }
  },
})
