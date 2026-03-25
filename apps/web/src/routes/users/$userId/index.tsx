import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session/index"
import { users } from "~/lib/users"
import { errorFmt, getCloudflareImageUrl } from "~/lib/utils"
import { UserView } from "~/views/user"

export const Route = createFileRoute("/users/$userId/")({
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
      title: user.name,
      description: user.bio
        ? user.bio.slice(0, 160)
        : `${user.name}'s profile on une.haus`,
      path: `/users/${user.id}`,
      image: user.avatarId
        ? getCloudflareImageUrl(user.avatarId, { width: 400, quality: 80 })
        : undefined,
      type: "profile",
    })
  },
})

function RouteComponent() {
  const { userId } = Route.useParams()
  const { data } = useSuspenseQuery(users.get.queryOptions({ userId }))

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb>{userId}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <UserView user={data} />
    </>
  )
}
