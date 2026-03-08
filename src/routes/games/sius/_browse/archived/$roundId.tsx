import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { SetLineage } from "~/components/games/sius/set-lineage"
import { games } from "~/lib/games"
import { invariant } from "~/lib/invariant"

export const Route = createFileRoute("/games/sius/_browse/archived/$roundId")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const roundId = Number.parseInt(params.roundId, 10)

    await context.queryClient.ensureQueryData(
      games.sius.rounds.archived.list.queryOptions(),
    )

    const round = await context.queryClient.ensureQueryData(
      games.sius.rounds.archived.get.queryOptions({ roundId }),
    )

    invariant(round, "Round not found")
  },
})

function RouteComponent() {
  const { roundId } = Route.useParams()
  const selectedRoundId = Number.parseInt(roundId, 10)

  const { data: selectedRound } = useSuspenseQuery(
    games.sius.rounds.archived.get.queryOptions({ roundId: selectedRoundId }),
  )

  const sets = selectedRound?.sets ?? []

  if (sets.length === 0) {
    return <div>round not found</div>
  }

  return (
    <div className="space-y-6">
      <SetLineage sets={sets} />
    </div>
  )
}
