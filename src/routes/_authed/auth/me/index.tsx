import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { users } from "~/lib/users"
import { UserView } from "~/views/user"

export const Route = createFileRoute("/_authed/auth/me/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const [authUser] = await Promise.all([
      context.queryClient.ensureQueryData(
        users.get.queryOptions({ userId: context.user.id }),
      ),
      context.queryClient.ensureInfiniteQueryData(
        users.activity.infiniteQueryOptions({ userId: context.user.id }),
      ),
    ])
    return {
      authUser,
    }
  },
})

function RouteComponent() {
  const { authUser } = Route.useLoaderData()

  const { data } = useSuspenseQuery(
    users.get.queryOptions({ userId: authUser.id }),
  )

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>profile</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <UserView user={data} />
    </>
  )
}
