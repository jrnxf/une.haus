import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { EditRiuSetForm } from "~/components/forms/games/rius"
import { PageHeader } from "~/components/page-header"
import { games } from "~/lib/games"
import { session } from "~/lib/session/index"
import { errorFmt } from "~/lib/utils"

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
})

export const Route = createFileRoute("/_authed/games/rius/sets/$setId/edit")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId } }) => {
    let set

    try {
      set = await context.queryClient.ensureQueryData(
        games.rius.sets.get.queryOptions({ setId }),
      )
    } catch (error) {
      await session.flash.set.fn({
        data: { type: "error", message: errorFmt(error) },
      })
      throw redirect({ to: "/games/rius/active" })
    }

    if (set.user.id !== context.user.id || set.riu.status !== "upcoming") {
      await session.flash.set.fn({
        data: {
          type: "error",
          message: "you can only edit your own upcoming sets",
        },
      })
      throw redirect({ to: "/games/rius/sets/$setId", params: { setId } })
    }

    return { set }
  },
})

function RouteComponent() {
  const { setId } = Route.useParams()
  const { data: set } = useSuspenseQuery(
    games.rius.sets.get.queryOptions({ setId }),
  )

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/rius/upcoming">
            rack it up
          </PageHeader.Crumb>
          <PageHeader.Crumb to={`/games/rius/sets/${setId}`}>
            {set.name}
          </PageHeader.Crumb>
          <PageHeader.Crumb>edit</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <EditRiuSetForm set={set} />
      </div>
    </>
  )
}
