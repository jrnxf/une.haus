import { createFileRoute, redirect } from "@tanstack/react-router"

import { session } from "~/lib/session"

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    )
    if (!sessionData.user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      })
    }

    return {
      user: sessionData.user,
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === "Not authenticated") {
      return <p>You are not authenticated</p>
    }

    throw error
  },
})
