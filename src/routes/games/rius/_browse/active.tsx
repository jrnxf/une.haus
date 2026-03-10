import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"

import { SetsGroupedList } from "~/components/games/sets-grouped-list"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { games, groupSetsByUserWithRankings } from "~/lib/games"
import { messages } from "~/lib/messages"
import { useSessionUser } from "~/lib/session/hooks"

const searchSchema = z.object({
  open: z.number().optional(),
})

export const Route = createFileRoute("/games/rius/_browse/active")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const activeRiuData = await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    )

    const messagePromises = activeRiuData.sets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    )

    await Promise.all(messagePromises)
  },
})

function RouteComponent() {
  const { open } = Route.useSearch()
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions())
  const user = useSessionUser()
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
      {!user ? (
        <EmptyContent>
          <Button asChild>
            <Link
              to="/auth"
              search={{
                redirect: location.href,
              }}
            >
              log in to join
            </Link>
          </Button>
        </EmptyContent>
      ) : !isUserInGame ? (
        <EmptyContent>
          <Button asChild>
            <Link to="/games/rius/upcoming/join">join</Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  ) : (
    <div className="space-y-6">
      <SetsGroupedList
        rankedRiders={rankedRiders}
        openUserId={open}
        basePath="/games/rius/active"
      />
    </div>
  )
}
