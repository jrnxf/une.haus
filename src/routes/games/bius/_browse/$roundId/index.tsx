import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { z } from "zod"

import { SetLineage } from "~/components/games/bius/set-lineage"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { games } from "~/lib/games"

const pathParametersSchema = z.object({
  roundId: z.coerce.number(),
})

export const Route = createFileRoute("/games/bius/_browse/$roundId/")({
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { roundId } }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.bius.rounds.queryOptions(),
    )

    const round = rounds.find((c) => c.id === roundId)
    if (!round) {
      throw redirect({ to: "/games/bius", replace: true })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { roundId } = Route.useParams()
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())

  const round = rounds.find((c) => c.id === roundId) ?? rounds[0]
  const sets = round.sets ?? []

  if (sets.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GhostIcon />
          </EmptyMedia>
          <EmptyTitle>no sets yet</EmptyTitle>
          <EmptyDescription>
            this round is waiting for its first set. upload one to get started!
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/games/bius/$biuId/upload" params={{ biuId: round.id }}>
              upload
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SetLineage sets={sets} />
      </div>
    </div>
  )
}
