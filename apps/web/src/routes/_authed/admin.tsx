import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { session } from "~/lib/session"

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: async ({ context, location }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    )

    // User ID 1 is admin
    if (!sessionData.user || sessionData.user.id !== 1) {
      const p = location.pathname

      // /admin/tricks/{id}/edit → suggest
      const match = p.match(/^\/admin\/tricks\/([^/]+)\/edit$/)
      if (match) {
        throw redirect({
          to: "/tricks/$trickId/suggest",
          params: { trickId: match[1] },
        })
      }

      throw redirect({ to: "/" })
    }

    return {
      user: sessionData.user,
    }
  },
  component: () => <Outlet />,
})
