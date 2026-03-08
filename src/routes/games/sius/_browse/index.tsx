import { createFileRoute, redirect } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { games } from "~/lib/games"

export const Route = createFileRoute("/games/sius/_browse/")({
  loader: async ({ context }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )

    if (rounds.length > 0) {
      throw redirect({
        to: "/games/sius/$roundId",
        params: { roundId: rounds[0].id },
        replace: true,
      })
    }
  },
  component: NoActiveRound,
})

function NoActiveRound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>no active round</EmptyTitle>
        <EmptyDescription>try again later</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
