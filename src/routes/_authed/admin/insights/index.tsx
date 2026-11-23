import { createFileRoute, redirect } from "@tanstack/react-router"

import { insights } from "~/lib/insights"

// The insights pages moved into the admin area. Old links still work.
export const Route = createFileRoute("/_authed/admin/insights/")({
  validateSearch: insights.schema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin", search, replace: true })
  },
})
