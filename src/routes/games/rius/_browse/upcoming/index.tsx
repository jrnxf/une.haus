import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { SetCard } from "~/components/games/set-card"
import { CountdownClock } from "~/components/ui/countdown-clock"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { UserChip } from "~/components/user-chip"
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

function NextGameCountdown() {
  const [targetDate, setTargetDate] = useState(() => getNextMondayMidnightUtc())

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() >= targetDate.getTime()) {
        setTargetDate(getNextMondayMidnightUtc())
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">starts in</span>
      <CountdownClock targetDate={targetDate} size="xs" variant="secondary" />
    </div>
  )
}

export const Route = createFileRoute("/games/rius/_browse/upcoming/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.upcoming.roster.queryOptions(),
    )
  },
})

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.upcoming.roster.queryOptions())

  const playerRoster = Object.values(data.roster)
  const hasUserSets = data.authUserSets && data.authUserSets.length > 0

  return (
    <div className="space-y-6">
      {hasUserSets && (
        <section className="space-y-4">
          <div className="grid gap-4">
            {data.authUserSets?.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                className="w-full"
                showStats={false}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        {playerRoster.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no riders</EmptyTitle>
              <EmptyDescription>
                be the first to join the next round?
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">roster</h2>
              <NextGameCountdown />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {playerRoster.map((player) => (
                <UserChip
                  key={player.id}
                  user={{
                    id: player.id,
                    name: player.name,
                    avatarId: player.avatarId,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
