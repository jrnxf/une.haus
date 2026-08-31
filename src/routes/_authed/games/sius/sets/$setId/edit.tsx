import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { EditSiuSetForm } from "~/components/forms/games/sius"
import { PageHeader } from "~/components/page-header"
import { games } from "~/lib/games"
import { session } from "~/lib/session/index"
import { errorFmt } from "~/lib/utils"

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
})

export const Route = createFileRoute("/_authed/games/sius/sets/$setId/edit")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId } }) => {
    let set

    try {
      set = await context.queryClient.ensureQueryData(
        games.sius.sets.get.queryOptions({ setId }),
      )
    } catch (error) {
      await session.flash.set.fn({
        data: { type: "error", message: errorFmt(error) },
      })
      throw redirect({ to: "/games/sius" })
    }

    if (!set || set.user.id !== context.user.id) {
      await session.flash.set.fn({
        data: {
          type: "error",
          message: "you can only edit your own sets",
        },
      })
      throw redirect({ to: "/games/sius/sets/$setId", params: { setId } })
    }

    return { set }
  },
})

function RouteComponent() {
  const { setId } = Route.useParams()
  const { data: set } = useSuspenseQuery(
    games.sius.sets.get.queryOptions({ setId }),
  )

  if (!set) return null

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/sius">stack it up</PageHeader.Crumb>
          <PageHeader.Crumb to={`/games/sius/sets/${setId}`}>
            {set.name}
          </PageHeader.Crumb>
          <PageHeader.Crumb>edit</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <EditSiuSetForm set={set} />
      </div>
    </>
  )
}
