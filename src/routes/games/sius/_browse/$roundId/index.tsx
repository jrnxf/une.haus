import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { z } from "zod"

import { RoundStatusBanner } from "~/components/games/sius/round-status-banner"
import { SetLineage } from "~/components/games/sius/set-lineage"
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

export const Route = createFileRoute("/games/sius/_browse/$roundId/")({
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { roundId } }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )

    const round = rounds.find((c) => c.id === roundId)
    if (!round) {
      throw redirect({ to: "/games/sius", replace: true })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { roundId } = Route.useParams()
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )

  const round = rounds.find((c) => c.id === roundId) ?? rounds[0]
  const sets = round.sets ?? []
  const activeSets = sets.filter((set) => !set.deletedAt)
  const voteCount = round.archiveVotes?.length ?? 0

  if (activeSets.length === 0) {
    return (
      <div className="space-y-6">
        <RoundStatusBanner
          status={round.status ?? "active"}
          roundLength={activeSets.length}
          voteCount={voteCount}
        />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GhostIcon />
            </EmptyMedia>
            <EmptyTitle>no sets yet</EmptyTitle>
            <EmptyDescription>
              this round is waiting for its first set. upload one to get
              started!
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/games/sius/$siuId/upload" params={{ siuId: round.id }}>
                upload
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <RoundStatusBanner
        status={round.status ?? "active"}
        roundLength={activeSets.length}
        voteCount={voteCount}
      />

      <SetLineage sets={sets} />
    </div>
  )
}
