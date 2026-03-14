import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"

import { RankedRiders } from "~/components/games/ranked-riders"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { useAuthGate } from "~/hooks/use-auth-gate"
import { games, groupSetsByUserWithRankings } from "~/lib/games"

const searchSchema = z.object({
  open: z.number().optional(),
})

export const Route = createFileRoute("/games/rius/_browse/active")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    )
  },
})

function RouteComponent() {
  const { open } = Route.useSearch()
  const navigate = useNavigate()
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions())
  const { sessionUser: user, authGate } = useAuthGate()
  const upcomingRosterQuery = useQuery({
    ...games.rius.upcoming.roster.queryOptions(),
    enabled: data.sets.length === 0 && Boolean(user),
  })

  const rankedRiders = useMemo(
    () => groupSetsByUserWithRankings(data.sets),
    [data.sets],
  )

  const isUserInGame = user
    ? Boolean(upcomingRosterQuery.data?.roster[user.id])
    : false

  return data.sets.length === 0 ? (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>no active round</EmptyTitle>
        <EmptyDescription>
          be the first to join the next round?
        </EmptyDescription>
      </EmptyHeader>
      {(user ? !isUserInGame : true) && (
        <EmptyContent>
          <Button
            onClick={() =>
              authGate(() => navigate({ to: "/games/rius/upcoming/join" }))
            }
          >
            join
          </Button>
        </EmptyContent>
      )}
    </Empty>
  ) : (
    <div className="space-y-6">
      <RankedRiders
        rankedRiders={rankedRiders}
        openUserId={open}
        basePath="/games/rius/active"
      />
    </div>
  )
}
