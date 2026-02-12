import { defineTask } from "nitro/task";
import { and, eq } from "drizzle-orm";
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
import { TASK_NAMES } from "../constants";

import PreGameTrickReminderTemplate from "../../../../emails/pre-game-trick-reminder";

const resendClient = new Resend(env.RESEND_API_KEY);

const BASE_URL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : env.VITE_APP_URL;

// Calculate days until next Monday 00:00 UTC
function getDaysUntilNextRotation(): number {
  const now = new Date();
  const nextMonday = new Date(now);

  // Find next Monday
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);

  const msUntil = nextMonday.getTime() - now.getTime();
  return Math.ceil(msUntil / (1000 * 60 * 60 * 24));
}

export default defineTask({
  meta: {
    name: TASK_NAMES.NOTIFICATIONS_PRE_TRICK_REMINDERS,
    description: "Send pre-game trick reminder emails to users with sets in upcoming round",
  },
  async run() {
    console.log("[notifications:pre-trick-reminders] Starting...");

    // Get the upcoming RIU
    const upcomingRiu = await db.query.rius.findFirst({
      where: eq(rius.status, "upcoming"),
    });

    if (!upcomingRiu) {
      console.log("[notifications:pre-trick-reminders] No upcoming RIU found");
      return {
        result: {
          success: true,
          sent: 0,
          skipped: 0,
          errors: 0,
          daysUntilStart: 0,
        },
      };
    }

    const daysUntilStart = getDaysUntilNextRotation();

    // Find users who have sets in the upcoming round AND want reminders
    const usersWithSets = await db
      .select({
        userId: riuSets.userId,
        email: users.email,
        name: users.name,
        setName: riuSets.name,
        setInstructions: riuSets.instructions,
        daysBefore: userNotificationSettings.preTrickReminderDaysBefore,
      })
      .from(riuSets)
      .innerJoin(users, eq(users.id, riuSets.userId))
      .innerJoin(
        userNotificationSettings,
        eq(userNotificationSettings.userId, riuSets.userId),
      )
      .where(
        and(
          eq(riuSets.riuId, upcomingRiu.id),
          eq(userNotificationSettings.preTrickReminderEnabled, true),
          eq(userNotificationSettings.emailUnsubscribedAll, false),
        ),
      );

    // Group sets by user
    const userSetsMap = new Map<
      number,
      {
        email: string;
        name: string;
        daysBefore: number | null;
        sets: { name: string; instructions: string | null }[];
      }
    >();

    for (const row of usersWithSets) {
      const existing = userSetsMap.get(row.userId);
      if (existing) {
        existing.sets.push({
          name: row.setName,
          instructions: row.setInstructions,
        });
      } else {
        userSetsMap.set(row.userId, {
          email: row.email,
          name: row.name,
          daysBefore: row.daysBefore,
          sets: [{ name: row.setName, instructions: row.setInstructions }],
        });
      }
    }

    // Filter to users whose reminder day matches
    const usersToNotify = [...userSetsMap.entries()].filter(
      ([, user]) => {
        const targetDays = user.daysBefore ?? 1;
        return daysUntilStart === targetDays;
      },
    );

    console.log(
      `[notifications:pre-trick-reminders] ${daysUntilStart} days until rotation, ${usersToNotify.length} users to notify`,
    );

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [userId, userData] of usersToNotify) {
      try {
        // Check if we already sent a reminder for this RIU
        const existingReminder = await db.query.emailRemindersSent.findFirst({
          where: and(
            eq(emailRemindersSent.userId, userId),
            eq(emailRemindersSent.reminderType, "pre_trick"),
            eq(emailRemindersSent.riuId, upcomingRiu.id),
          ),
        });

        if (existingReminder) {
          skippedCount++;
          continue;
        }

        const setCount = userData.sets.length;
        const subject =
          setCount === 1
            ? "Your set goes live tomorrow"
            : `Your ${setCount} sets go live tomorrow`;

        // Send email
        const { error } = await resendClient.emails.send({
          from: "une.haus <colby@jrnxf.co>",
          to: [userData.email],
          subject,
          react: PreGameTrickReminderTemplate({
            userName: userData.name,
            sets: userData.sets.map((s) => ({
              name: s.name,
              instructions: s.instructions ?? undefined,
            })),
            reviewSetsUrl: `${BASE_URL}/games/rius/upcoming`,
            unsubscribeReminderUrl: `${BASE_URL}/api/unsubscribe?type=pre_trick&userId=${userId}`,
            unsubscribeAllUrl: `${BASE_URL}/api/unsubscribe?type=all&userId=${userId}`,
          }),
        });

        if (error) {
          console.error(
            `[notifications:pre-trick-reminders] Failed to send to user ${userId}:`,
            error,
          );
          errorCount++;
          continue;
        }

        // Record that we sent this reminder
        await db.insert(emailRemindersSent).values({
          userId,
          reminderType: "pre_trick",
          riuId: upcomingRiu.id,
        });

        sentCount++;
        console.log(
          `[notifications:pre-trick-reminders] Sent to user ${userId} with ${setCount} sets`,
        );
      } catch (error) {
        console.error(
          `[notifications:pre-trick-reminders] Error processing user ${userId}:`,
          error,
        );
        errorCount++;
      }
    }

    console.log(
      `[notifications:pre-trick-reminders] Complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    );

    return {
      result: {
        success: true,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        daysUntilStart,
      },
    };
  },
});
