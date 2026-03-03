import { createFileRoute, redirect } from "@tanstack/react-router"

import { games } from "~/lib/games"

export const Route = createFileRoute("/games/sius/archived/")({
  loader: async ({ context }) => {
    const archivedRounds = await context.queryClient.ensureQueryData(
      games.sius.rounds.archived.list.queryOptions(),
    )

    if (archivedRounds.length === 0) {
      return
    }

    throw redirect({
      to: "/games/sius/archived/$roundId",
      params: { roundId: archivedRounds[0].id.toString() },
      replace: true,
    })
  },
  component: EmptyArchive,
})

function EmptyArchive() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">archived</h2>
        <p className="text-muted-foreground text-sm">
          previous rounds and their sets
        </p>
      </div>
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">
          no archived rounds yet. complete a round to see it here!
        </p>
      </div>
    </div>
  )
}
