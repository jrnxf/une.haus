import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { MembersTable } from "~/components/insights/members-table"
import { insights } from "~/lib/insights"

export const Route = createFileRoute("/_authed/admin/insights/members")({
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      insights.members.queryOptions(deps),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { days } = Route.useSearch()
  const { data } = useSuspenseQuery(insights.members.queryOptions({ days }))

  return (
    <MembersTable
      today={data.today}
      features={data.features}
      members={data.members}
    />
  )
}
