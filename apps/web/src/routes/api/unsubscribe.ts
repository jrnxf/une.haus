import { createFileRoute } from "@tanstack/react-router"

import { env } from "~/lib/env"
import { unsubscribe } from "~/lib/notification-settings/ops.server"

const BASE_URL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : env.VITE_APP_URL

const VALID_TYPES = new Set(["all", "digest", "game_start"])

export const Route = createFileRoute("/api/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get("type")
        const userId = url.searchParams.get("userId")

        if (!type || !userId) {
          return new Response("Missing required parameters", { status: 400 })
        }

        if (!VALID_TYPES.has(type)) {
          return new Response("Invalid unsubscribe type", { status: 400 })
        }

        const userIdNum = Number(userId)
        if (Number.isNaN(userIdNum)) {
          return new Response("Invalid userId", { status: 400 })
        }

        try {
          await unsubscribe({
            type: type as "all" | "digest" | "game_start",
            userId: userIdNum,
          })

          return Response.redirect(
            `${BASE_URL}/notifications/settings?unsubscribed=${type}`,
            302,
          )
        } catch (error) {
          console.error("[unsubscribe] Error:", error)
          return new Response("Failed to unsubscribe", { status: 500 })
        }
      },
    },
  },
})
