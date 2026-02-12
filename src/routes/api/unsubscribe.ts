import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { db } from "~/db";
import { userNotificationSettings } from "~/db/schema";
import { env } from "~/lib/env";

const BASE_URL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : env.VITE_APP_URL;

export const Route = createFileRoute("/api/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        const userId = url.searchParams.get("userId");

        if (!type || !userId) {
          return new Response("Missing required parameters", { status: 400 });
        }

        const userIdNum = Number(userId);
        if (Number.isNaN(userIdNum)) {
          return new Response("Invalid userId", { status: 400 });
        }

        try {
          const updates: Partial<{
            emailDigestEnabled: boolean;
            gameStartReminderEnabled: boolean;
            preTrickReminderEnabled: boolean;
            emailUnsubscribedAll: boolean;
          }> = {};

          switch (type) {
            case "digest": {
              updates.emailDigestEnabled = false;
              break;
            }
            case "game_start": {
              updates.gameStartReminderEnabled = false;
              break;
            }
            case "pre_trick": {
              updates.preTrickReminderEnabled = false;
              break;
            }
            case "all": {
              updates.emailUnsubscribedAll = true;
              break;
            }
            default: {
              return new Response("Invalid unsubscribe type", { status: 400 });
            }
          }

          await db
            .update(userNotificationSettings)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(userNotificationSettings.userId, userIdNum));

          // Redirect to a success page
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${BASE_URL}/notifications/settings?unsubscribed=${type}`,
            },
          });
        } catch (error) {
          console.error("[unsubscribe] Error:", error);
          return new Response("Failed to unsubscribe", { status: 500 });
        }
      },
    },
  },
});
