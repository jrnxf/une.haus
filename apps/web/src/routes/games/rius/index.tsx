import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import pluralize from "pluralize"
import { Suspense, useMemo } from "react"

import { InfiniteScrollTrigger } from "~/components/infinite-scroll-trigger"
import { Button } from "~/components/ui/button"
import { CountdownClock } from "~/components/ui/countdown-clock"
import { Metaline } from "~/components/ui/metaline"
import { StatusIndicator } from "~/components/ui/status"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { games } from "~/lib/games"

function getNextMondayMidnightUtc(nowMs = Date.now()) {
  const now = new Date(nowMs)
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      0,
      0,
      0,
      0,
    ),
  )
}

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

export const Route = createFileRoute("/games/rius/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        games.rius.active.list.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.rius.upcoming.roster.queryOptions(),
      ),
      context.queryClient.ensureInfiniteQueryData(
        games.rius.archived.rounds.infiniteQueryOptions(),
      ),
    ])
  },
})

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-muted-foreground text-sm font-medium">{children}</h2>
  )
}

function RouteComponent() {
  return (
    <div className="@container mx-auto w-full max-w-4xl p-4">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
          <section className="flex flex-col gap-2">
            <SectionLabel>active</SectionLabel>
            <ActiveRoundCard />
          </section>
          <section className="flex flex-col gap-2">
            <SectionLabel>upcoming</SectionLabel>
            <UpcomingRoundCard />
          </section>
        </div>
        <Suspense>
          <ArchivedRoundsSection />
        </Suspense>
      </div>
    </div>
  )
}

function ActiveRoundCard() {
  const { data: activeRiu } = useSuspenseQuery(
    games.rius.active.list.queryOptions(),
  )

  const setsCount = activeRiu.sets.length
  const submissionsCount = activeRiu.sets.reduce(
    (sum, set) => sum + (set.submissions?.length ?? 0),
    0,
  )

  const uniqueRiders = useMemo(() => {
    const userIds = new Set<number>()
    for (const set of activeRiu.sets) {
      userIds.add(set.user.id)
      for (const sub of set.submissions ?? []) {
        userIds.add(sub.user.id)
      }
    }
    return userIds.size
  }, [activeRiu.sets])

  return (
    <Button variant="card" className="flex w-full overflow-hidden p-4" asChild>
      <Link to="/games/rius/active">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusIndicator className="bg-green-600" />
              <p className="truncate text-sm font-semibold">{activeRiu.id}</p>
            </div>
            <DateLabel date={activeRiu.createdAt} />
          </div>
          <Metaline
            className="block truncate text-xs"
            parts={[
              `${uniqueRiders} ${pluralize("rider", uniqueRiders)}`,
              `${setsCount} ${pluralize("set", setsCount)}`,
              `${submissionsCount} ${pluralize("sub", submissionsCount)}`,
            ]}
          />
        </div>
      </Link>
    </Button>
  )
}

function UpcomingRoundCard() {
  const { data: upcomingRoster } = useSuspenseQuery(
    games.rius.upcoming.roster.queryOptions(),
  )

  const rosterEntries = Object.values(upcomingRoster.roster)
  const riderCount = rosterEntries.length
  const totalSets = rosterEntries.reduce((sum, r) => sum + r.count, 0)
  const nextMidnightUtc = useMemo(() => getNextMondayMidnightUtc(), [])

  return (
    <Button
      variant="card"
      className="flex w-full overflow-hidden border-dashed p-4"
      asChild
    >
      <Link to="/games/rius/upcoming">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">
              {upcomingRoster.round ? upcomingRoster.round.id : "upcoming"}
            </p>
            <CountdownClock
              targetDate={nextMidnightUtc}
              size="xs"
              variant="muted"
            />
          </div>
          <Metaline
            className="block truncate text-xs"
            parts={[
              `${riderCount} ${pluralize("rider", riderCount)}`,
              `${totalSets} ${pluralize("set", totalSets)}`,
            ]}
          />
        </div>
      </Link>
    </Button>
  )
}

// const RANK_LABELS = ["1st", "2nd", "3rd"] as const

function ArchivedRoundsSection() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(games.rius.archived.rounds.infiniteQueryOptions())

  const rounds = data.pages.flat()

  if (rounds.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>archived</SectionLabel>
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
        {rounds.map((round) => (
          <Button
            key={round.id}
            variant="card"
            className="flex w-full overflow-hidden p-4"
            asChild
          >
            <Link
              to="/games/rius/archived/$riuId"
              params={{ riuId: round.id.toString() }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{round.id}</p>
                  <DateLabel date={round.createdAt} />
                </div>
                <Metaline
                  className="block truncate text-xs"
                  parts={[
                    `${round.ridersCount} ${pluralize("rider", round.ridersCount)}`,
                    `${round.setsCount} ${pluralize("set", round.setsCount)}`,
                    `${round.submissionsCount} ${pluralize("sub", round.submissionsCount)}`,
                  ]}
                />
              </div>
            </Link>
          </Button>
        ))}
      </div>
      <InfiniteScrollTrigger
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </section>
  )
}
