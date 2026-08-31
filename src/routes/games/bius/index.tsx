import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import pluralize from "pluralize"

import { Button } from "~/components/ui/button"
import { Metaline } from "~/components/ui/metaline"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { games } from "~/lib/games"

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })
}

const formatDateLong = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function DateLabel({ date }: { date: Date | string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatDate(date)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{formatDateLong(date)}</TooltipContent>
    </Tooltip>
  )
}

export const Route = createFileRoute("/games/bius/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(games.bius.rounds.queryOptions())
  },
})

function RouteComponent() {
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())
  const sortedRounds = [...rounds].toSorted((a, b) => b.id - a.id)

  return (
    <div className="@container mx-auto w-full max-w-4xl p-4">
      <div className="flex flex-col gap-4">
        {sortedRounds.map((round) => {
          const setsCount = round.sets?.length ?? 0
          const userIds = new Set<number>()
          for (const set of round.sets ?? []) {
            userIds.add(set.user.id)
          }
          const uniqueRiders = userIds.size

          return (
            <Button
              key={round.id}
              variant="card"
              className="flex w-full overflow-hidden p-4"
              asChild
            >
              <Link to="/games/bius/$roundId" params={{ roundId: round.id }}>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{round.id}</p>
                    <DateLabel date={round.createdAt} />
                  </div>
                  <Metaline
                    className="block truncate text-xs"
                    parts={[
                      `${uniqueRiders} ${pluralize("rider", uniqueRiders)}`,
                      `${setsCount} ${pluralize("set", setsCount)}`,
                    ]}
                  />
                </div>
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
