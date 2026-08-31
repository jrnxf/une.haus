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

export const Route = createFileRoute("/games/rius/_browse/archived/")({
  loader: async ({ context }) => {
    const archivedRius = await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    )

    if (archivedRius.length === 0) {
      return
    }

    throw redirect({
      to: "/games/rius/archived/$riuId",
      params: { riuId: archivedRius[0].id.toString() },
      replace: true,
    })
  },
  component: EmptyArchive,
})

function EmptyArchive() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>no archived rounds</EmptyTitle>
        <EmptyDescription>completed rounds will show up here</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
