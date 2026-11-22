import { createFileRoute } from "@tanstack/react-router"

import { background } from "~/lib/execution-context"
import { isRoutePattern } from "~/lib/insights/features"
import { recordView } from "~/lib/insights/record.server"
import { getServerSessionUser } from "~/lib/session/hooks"

// The page view beacon. The browser sends the route pattern of each page it
// shows (such as /vault/$videoId, never the real URL), and the view counts
// toward admin insights. See src/router.tsx.
export const Route = createFileRoute("/api/view")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const route = await request.text()
        if (!isRoutePattern(route)) return new Response(null, { status: 400 })
        const user = await getServerSessionUser()
        background(recordView(route, user?.id ?? null), "page view")
        return new Response(null, { status: 204 })
      },
    },
  },
})
