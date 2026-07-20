import { createFileRoute, redirect } from "@tanstack/react-router"

import { ActivityFeed } from "~/components/activity-feed"
import { PageHeader } from "~/components/page-header"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session/index"
import { users } from "~/lib/users"
import { errorFmt } from "~/lib/utils"

export const Route = createFileRoute("/users/$userId/activity")({
  component: RouteComponent,
  params: users.get.schema,
  loader: async ({ context, params: { userId } }) => {
    try {
      const [user] = await Promise.all([
        context.queryClient.ensureQueryData(users.get.queryOptions({ userId })),
        context.queryClient.ensureInfiniteQueryData(
          users.activity.infiniteQueryOptions({ userId }),
        ),
      ])
      return { user }
    } catch (error) {
      await session.flash.set.fn({
        data: { type: "error", message: errorFmt(error) },
      })
      throw redirect({ to: "/users" })
    }
  },
  head: ({ loaderData }) => {
    const user = loaderData?.user
    if (!user) return {}

    return seo({
      title: `${user.name} activity`,
      description: `recent activity from ${user.name} on une.haus`,
      path: `/users/${user.id}/activity`,
    })
  },
})

function RouteComponent() {
  const { userId } = Route.useParams()

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb to={`/users/${userId}`}>{userId}</PageHeader.Crumb>
          <PageHeader.Crumb>activity</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <ActivityFeed userId={userId} />
        </div>
      </div>
    </>
  )
}
