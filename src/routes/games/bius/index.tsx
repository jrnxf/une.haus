import { createFileRoute, redirect } from "@tanstack/react-router"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
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
        <EmptyTitle>no rounds</EmptyTitle>
        <EmptyDescription>
          there are no rounds right now. check back soon for a new challenge to
          back up!
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
