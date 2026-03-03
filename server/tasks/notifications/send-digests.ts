import { and, eq, isNull, sql } from "drizzle-orm"
import { defineTask } from "nitro/task"
import { Resend } from "resend"

import NotificationDigestTemplate from "../../../emails/notification-digest"
import { db } from "~/db"
import { notifications, userNotificationSettings, users } from "~/db/schema"
import { env } from "~/lib/env"
import { TASK_NAMES } from "~/lib/tasks/constants"

const resendClient = new Resend(env.RESEND_API_KEY)

const BASE_URL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : env.VITE_APP_URL

export default defineTask({
  meta: {
    name: TASK_NAMES.NOTIFICATIONS_SEND_DIGESTS,
    description: "Send notification digest emails to opted-in users",
  },
  async run() {
    console.log("[notifications:send-digests] Starting digest send...")

    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentDay = now.getUTCDay()

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
          eq(userNotificationSettings.emailDigestEnabled, true),
          eq(userNotificationSettings.emailUnsubscribedAll, false),
          eq(userNotificationSettings.emailDigestHourUtc, currentHour),
          // For weekly digests, also check the day
          sql`
            (
                        ${userNotificationSettings.emailDigestFrequency} = 'daily'
                        OR (
                          ${userNotificationSettings.emailDigestFrequency} = 'weekly'
                          AND ${userNotificationSettings.emailDigestDayOfWeek} = ${currentDay}
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
        // Get unread, unemailed notifications for this user
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

        // Group notifications by type
        const likesNotifications = userNotifications.filter(
          (n) => n.type === "like",
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
            items: likesNotifications.map((n) => ({
              title: n.entityTitle
                ? `Your ${n.entityType} "${n.entityTitle}" got a like`
                : `Your ${n.entityType} got a like`,
            })),
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
        const { error } = await resendClient.emails.send({
          from: "une.haus <colby@jrnxf.co>",
          to: [user.email],
          subject: "your week on une.haus",
          react: NotificationDigestTemplate({
            userName: user.name,
            groups,
            unsubscribeDigestUrl: `${BASE_URL}/api/unsubscribe?type=digest&userId=${user.userId}`,
            unsubscribeAllUrl: `${BASE_URL}/api/unsubscribe?type=all&userId=${user.userId}`,
            viewNotificationsUrl: `${BASE_URL}/notifications`,
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

        // Mark notifications as emailed
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

    return {
      result: {
        success: true,
        sent: sentCount,
        errors: errorCount,
      },
    }
  },
})
