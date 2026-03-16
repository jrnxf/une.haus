import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { AddSetForm, CreateFirstSetForm } from "~/components/forms/games/sius"
import { PageHeader } from "~/components/page-header"
import { games } from "~/lib/games"
import { invariant } from "~/lib/invariant"
import { session } from "~/lib/session/index"

const paramsSchema = z.object({
  siuId: z.coerce.number().int().positive(),
})

export const Route = createFileRoute("/_authed/games/sius/$siuId/upload")({
  component: RouteComponent,
  params: {
    parse: paramsSchema.parse,
  },
  loader: async ({ context, params }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )

    const round = rounds.find((c) => c.id === params.siuId)
    if (!round) {
      throw redirect({ to: "/games", replace: true })
    }

    const latestSet = round.sets?.find((set) => !set.deletedAt)
    if (!latestSet) {
      return
    }

    await context.queryClient.ensureQueryData(
      games.sius.sets.line.queryOptions({ setId: latestSet.id }),
    )
  },
  onError: async () => {
    await session.flash.set.fn({
      data: { type: "error", message: "invalid upload link" },
    })
    throw redirect({ to: "/games" })
  },
})

function RouteComponent() {
  const { siuId } = Route.useParams()
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )
  const round = rounds.find((c) => c.id === siuId)

  invariant(round, "Round not found")

  const latestSet = round.sets?.find((set) => !set.deletedAt)

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/sius">stack it up</PageHeader.Crumb>
          <PageHeader.Crumb>upload</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        {latestSet ? (
          <AddSetForm roundId={round.id} />
        ) : (
          <CreateFirstSetForm roundId={round.id} />
        )}
      </div>
    </>
  )
}
