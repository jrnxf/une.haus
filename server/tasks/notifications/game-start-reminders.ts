import { defineTask } from "nitro/task";
import { and, eq, sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "~/db";
import {
  emailRemindersSent,
  rius,
  riuSets,
  userNotificationSettings,
  users,
} from "~/db/schema";
import { env } from "~/lib/env";
import { TASK_NAMES } from "~/lib/tasks/constants";

import GameStartReminderTemplate from "../../../emails/game-start-reminder";

const resendClient = new Resend(env.RESEND_API_KEY);

const BASE_URL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : env.VITE_APP_URL;

// Calculate hours until next Monday 00:00 UTC
function getHoursUntilNextRotation(): number {
  const now = new Date();
  const nextMonday = new Date(now);

  // Find next Monday
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);

  const msUntil = nextMonday.getTime() - now.getTime();
  return Math.floor(msUntil / (1000 * 60 * 60));
}

export default defineTask({
  meta: {
    name: TASK_NAMES.NOTIFICATIONS_GAME_START_REMINDERS,
    description: "Send game start reminder emails to opted-in users",
  },
  async run() {
    console.log("[notifications:game-start-reminders] Starting...");

    // Get the upcoming RIU
    const upcomingRiu = await db.query.rius.findFirst({
      where: eq(rius.status, "upcoming"),
    });

    if (!upcomingRiu) {
      console.log("[notifications:game-start-reminders] No upcoming RIU found");
      return {
        result: {
          success: true,
          sent: 0,
          skipped: 0,
          errors: 0,
          hoursUntilStart: 0,
        },
      };
    }

    const hoursUntilStart = getHoursUntilNextRotation();

    // Get set and rider counts for the upcoming round
    const setStats = await db
      .select({
        setCount: sql<number>`count(*)`,
        riderCount: sql<number>`count(distinct ${riuSets.userId})`,
      })
      .from(riuSets)
      .where(eq(riuSets.riuId, upcomingRiu.id));

    const { setCount, riderCount } = setStats[0] ?? { setCount: 0, riderCount: 0 };

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
      );

    // Filter to users whose reminder time matches current hours until start
    const usersToNotify = eligibleUsers.filter((user) => {
      const targetHours = user.hoursBefore ?? 24;
      // Allow a 1-hour window for the check
      return hoursUntilStart <= targetHours && hoursUntilStart > targetHours - 1;
    });

    console.log(
      `[notifications:game-start-reminders] ${hoursUntilStart}h until rotation, ${usersToNotify.length} potential users`,
    );

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of usersToNotify) {
      try {
        // Check if we already sent a reminder for this RIU
        const existingReminder = await db.query.emailRemindersSent.findFirst({
          where: and(
            eq(emailRemindersSent.userId, user.userId),
            eq(emailRemindersSent.reminderType, "game_start"),
            eq(emailRemindersSent.riuId, upcomingRiu.id),
          ),
        });

        if (existingReminder) {
          skippedCount++;
          continue;
        }

        // Send email
        const { error } = await resendClient.emails.send({
          from: "une.haus <colby@jrnxf.co>",
          to: [user.email],
          subject: "New RIU round starts tomorrow",
          react: GameStartReminderTemplate({
            userName: user.name,
            hoursUntilStart,
            riderCount: Number(riderCount),
            setCount: Number(setCount),
            viewRoundUrl: `${BASE_URL}/games/rius/upcoming`,
            addSetUrl: `${BASE_URL}/games/rius/upcoming/sets/create`,
            unsubscribeReminderUrl: `${BASE_URL}/api/unsubscribe?type=game_start&userId=${user.userId}`,
            unsubscribeAllUrl: `${BASE_URL}/api/unsubscribe?type=all&userId=${user.userId}`,
          }),
        });

        if (error) {
          console.error(
            `[notifications:game-start-reminders] Failed to send to user ${user.userId}:`,
            error,
          );
          errorCount++;
          continue;
        }

        // Record that we sent this reminder
        await db.insert(emailRemindersSent).values({
          userId: user.userId,
          reminderType: "game_start",
          riuId: upcomingRiu.id,
        });

        sentCount++;
        console.log(
          `[notifications:game-start-reminders] Sent to user ${user.userId}`,
        );
      } catch (error) {
        console.error(
          `[notifications:game-start-reminders] Error processing user ${user.userId}:`,
          error,
        );
        errorCount++;
      }
    }

    console.log(
      `[notifications:game-start-reminders] Complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    );

    return {
      result: {
        success: true,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        hoursUntilStart,
      },
    };
  },
});
