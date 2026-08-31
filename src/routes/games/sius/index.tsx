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

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-muted-foreground text-sm font-medium">{children}</h2>
  )
}

export const Route = createFileRoute("/games/sius/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        games.sius.rounds.active.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.sius.rounds.archived.list.queryOptions(),
      ),
    ])
  },
})

function RouteComponent() {
  const { data: activeRounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )
  const { data: archivedRounds } = useSuspenseQuery(
    games.sius.rounds.archived.list.queryOptions(),
  )

  return (
    <div className="@container mx-auto w-full max-w-4xl p-4">
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          {archivedRounds.length > 0 && <SectionLabel>active</SectionLabel>}
          <div className="flex flex-col gap-4">
            {activeRounds
              .toSorted((a, b) => b.id - a.id)
              .map((round) => {
                const activeSets = (round.sets ?? []).filter(
                  (set) => !set.deletedAt,
                )
                const setsCount = activeSets.length
                const userIds = new Set<number>()
                for (const set of activeSets) {
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
                    <Link
                      to="/games/sius/$roundId"
                      params={{ roundId: round.id }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {round.id}
                          </p>
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
        </section>
        {archivedRounds.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionLabel>archived</SectionLabel>
            <div className="flex flex-col gap-4">
              {archivedRounds
                .toSorted((a, b) => b.id - a.id)
                .map((round) => (
                  <Button
                    key={round.id}
                    variant="card"
                    className="flex w-full overflow-hidden p-4"
                    asChild
                  >
                    <Link
                      to="/games/sius/archived/$roundId"
                      params={{ roundId: round.id.toString() }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {round.id}
                          </p>
                          <DateLabel date={round.createdAt} />
                        </div>
                        <Metaline
                          className="block truncate text-xs"
                          parts={[
                            `${round.setsCount} ${pluralize("set", round.setsCount)}`,
                          ]}
                        />
                      </div>
                    </Link>
                  </Button>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
