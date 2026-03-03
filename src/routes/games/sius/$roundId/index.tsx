import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ArchiveVoteButton } from "~/components/games/sius/archive-vote-button"
import { RoundStatusBanner } from "~/components/games/sius/round-status-banner"
import { SetLineage } from "~/components/games/sius/set-lineage"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

const pathParametersSchema = z.object({
  roundId: z.coerce.number(),
})

export const Route = createFileRoute("/games/sius/$roundId/")({
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
  const sessionUser = useSessionUser()

  const round = rounds.find((c) => c.id === roundId) ?? rounds[0]
  const sets = round.sets ?? []
  const latestSet = sets[0]
  const voteCount = round.archiveVotes?.length ?? 0
  const hasVoted =
    sessionUser && round.archiveVotes?.some((v) => v.user.id === sessionUser.id)

  const canAddSet =
    sessionUser &&
    latestSet &&
    latestSet.user.id !== sessionUser.id &&
    round.status === "active"

  return (
    <div className="space-y-6">
      <RoundStatusBanner
        status={round.status ?? "active"}
        roundLength={sets.length}
        voteCount={voteCount}
      />

      {latestSet && round.status === "active" && (
        <div className="flex items-center gap-2">
          {canAddSet ? (
            <Button asChild>
              <Link
                to="/games/sius/upload"
                search={{ parentSetId: latestSet.id }}
              >
                upload
              </Link>
            </Button>
          ) : sessionUser ? (
            latestSet.user.id === sessionUser.id ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button disabled>upload</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  you can&apos;t stack your own trick
                </TooltipContent>
              </Tooltip>
            ) : null
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button disabled>upload</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>sign in to stack it up</TooltipContent>
            </Tooltip>
          )}

          {sessionUser && (
            <ArchiveVoteButton
              roundId={round.id}
              voteCount={voteCount}
              hasVoted={!!hasVoted}
            />
          )}
        </div>
      )}

      <SetLineage sets={sets} />
    </div>
  )
}
