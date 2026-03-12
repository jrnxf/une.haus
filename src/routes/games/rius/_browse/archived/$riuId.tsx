import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"

import { RankedRiders } from "~/components/games/ranked-riders"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { games, groupSetsByUserWithRankings } from "~/lib/games"
import { invariant } from "~/lib/invariant"

const searchSchema = z.object({
  open: z.number().optional(),
})

export const Route = createFileRoute("/games/rius/_browse/archived/$riuId")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context, params }) => {
    const riuId = Number.parseInt(params.riuId, 10)

    await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    )

    const riu = await context.queryClient.ensureQueryData(
      games.rius.archived.get.queryOptions({ riuId }),
    )

    invariant(riu, "RIU not found")
  },
})

function RouteComponent() {
  const { riuId } = Route.useParams()
  const { open } = Route.useSearch()
  const selectedRiuId = Number.parseInt(riuId, 10)

  const { data: selectedRiu } = useSuspenseQuery(
    games.rius.archived.get.queryOptions({ riuId: selectedRiuId }),
  )

  const rankedRiders = useMemo(() => {
    if (!selectedRiu) return []
    return groupSetsByUserWithRankings(selectedRiu.sets)
  }, [selectedRiu])

  const setCount = selectedRiu?.sets.length ?? 0
  const submissionCount =
    selectedRiu?.sets.reduce(
      (count, set) => count + set.submissions.length,
      0,
    ) ?? 0
  const hasNoActivity = setCount === 0 && submissionCount === 0

  return (
    <div className="space-y-6">
      {hasNoActivity ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GhostIcon />
            </EmptyMedia>
            <EmptyTitle>no activity</EmptyTitle>
            <EmptyDescription>no riders joined this round</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <RankedRiders
          rankedRiders={rankedRiders}
          openUserId={open}
          basePath="/games/rius/archived/$riuId"
          pathParams={{ riuId }}
        />
      )}
    </div>
  )
}
