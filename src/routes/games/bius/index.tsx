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

export const Route = createFileRoute("/games/bius/")({
  loader: async ({ context }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.bius.rounds.queryOptions(),
    )

    if (rounds.length > 0) {
      throw redirect({
        to: "/games/bius/$roundId",
        params: { roundId: rounds[0].id },
        replace: true,
      })
    }
  },
  component: NoRoundsComponent,
})

function NoRoundsComponent() {
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
