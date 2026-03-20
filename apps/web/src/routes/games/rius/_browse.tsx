import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"
import pluralize from "pluralize"
import { useMemo } from "react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { ContentHeaderDropdown } from "~/components/games/content-header-dropdown"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
import { CountdownClock } from "~/components/ui/countdown-clock"
import { Metaline } from "~/components/ui/metaline"
import { useAuthGate } from "~/hooks/use-auth-gate"
import { games } from "~/lib/games"

export const Route = createFileRoute("/games/rius/_browse")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        games.rius.active.list.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.rius.archived.list.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.rius.upcoming.roster.queryOptions(),
      ),
    ])
  },
})

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

const formatDate = (createdAt: Date | string) => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function RouteComponent() {
  const { sessionUser, authGate } = useAuthGate()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const { data: activeRiu } = useSuspenseQuery(
    games.rius.active.list.queryOptions(),
  )
  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  )
  const { data: upcomingRoster } = useSuspenseQuery(
    games.rius.upcoming.roster.queryOptions(),
  )

  const isUpcoming = pathname.startsWith("/games/rius/upcoming")
  const isActive = pathname.startsWith("/games/rius/active")
  const selectedArchivedRoundId =
    pathname.match(/^\/games\/rius\/archived\/(\d+)$/)?.[1] ??
    archivedRius[0]?.id.toString() ??
    ""

  const upcomingSetCount = Math.min(upcomingRoster.authUserSets?.length ?? 0, 3)
  const isUpcomingUploadLimitReached = upcomingSetCount >= 3

  // Compute active round stats
  const activeSetsCount = activeRiu.sets.length
  const activeSubmissionsCount = activeRiu.sets.reduce(
    (sum, set) => sum + (set.submissions?.length ?? 0),
    0,
  )

  const upcomingRound = upcomingRoster.round
  const nextMidnightUtc = useMemo(() => getNextMondayMidnightUtc(), [])

  // Determine trigger label
  const triggerLabel = isUpcoming
    ? upcomingRound
      ? `round ${upcomingRound.id}`
      : "upcoming"
    : isActive
      ? `round ${activeRiu.id}`
      : `round ${selectedArchivedRoundId}`

  // Determine dropdown value
  const dropdownValue = isUpcoming
    ? "upcoming"
    : isActive
      ? `active-${activeRiu.id}`
      : `archived-${selectedArchivedRoundId}`

  // Build grouped options
  const rosterEntries = Object.values(upcomingRoster.roster)
  const upcomingRiderCount = rosterEntries.length
  const upcomingTotalSets = rosterEntries.reduce((sum, r) => sum + r.count, 0)

  const upcomingOptions = [
    {
      value: "upcoming",
      label: upcomingRound ? `round ${upcomingRound.id}` : "upcoming",
      description: (
        <Metaline
          className="text-xs"
          parts={[
            `${upcomingTotalSets} ${pluralize("set", upcomingTotalSets)}`,
            `${upcomingRiderCount} ${pluralize("rider", upcomingRiderCount)}`,
            <CountdownClock
              key="countdown"
              targetDate={nextMidnightUtc}
              size="xs"
              variant="muted"
            />,
          ]}
        />
      ),
    },
  ]

  const activeOptions = [
    {
      value: `active-${activeRiu.id}`,
      label: `round ${activeRiu.id}`,
      description: (
        <Metaline
          className="text-xs"
          parts={[
            formatDate(activeRiu.createdAt),
            `${activeSetsCount} ${pluralize("set", activeSetsCount)}`,
            `${activeSubmissionsCount} ${pluralize("submission", activeSubmissionsCount)}`,
          ]}
        />
      ),
    },
  ]

  const archivedOptions = [...archivedRius]
    .toSorted((a, b) => b.id - a.id)
    .map((riu) => ({
      value: `archived-${riu.id}`,
      label: `round ${riu.id}`,
      description: (
        <Metaline
          className="text-xs"
          parts={[
            formatDate(riu.createdAt),
            `${riu.setsCount} ${pluralize("set", riu.setsCount)}`,
            `${riu.submissionsCount} ${pluralize("submission", riu.submissionsCount)}`,
          ]}
        />
      ),
    }))

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
        left={
          <ContentHeaderDropdown
            value={dropdownValue}
            triggerLabel={triggerLabel}
            groups={[
              { label: "upcoming", options: upcomingOptions },
              { label: "active", options: activeOptions },
              ...(archivedOptions.length > 0
                ? [{ label: "previous", options: archivedOptions }]
                : []),
            ]}
            onValueChange={(value) => {
              if (!value) return
              if (value === "upcoming") {
                navigate({ to: "/games/rius/upcoming" })
              } else if (value.startsWith("active-")) {
                navigate({ to: "/games/rius/active" })
              } else if (value.startsWith("archived-")) {
                const riuId = value.replace("archived-", "")
                navigate({
                  to: "/games/rius/archived/$riuId",
                  params: { riuId },
                })
              }
            }}
            contentClassName="max-h-[300px] overflow-y-auto w-fit min-w-max"
          />
        }
        right={
          isUpcoming ? (
            isUpcomingUploadLimitReached ? (
              <Button disabled className="relative">
                upload
                <CountChip className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
                  {upcomingSetCount}/3
                </CountChip>
              </Button>
            ) : (
              <Button
                className="relative"
                onClick={() =>
                  authGate(() => navigate({ to: "/games/rius/upcoming/join" }))
                }
              >
                upload
                {sessionUser && (
                  <CountChip className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
                    {upcomingSetCount}/3
                  </CountChip>
                )}
              </Button>
            )
          ) : isActive ? (
            <Tray>
              <TrayTrigger asChild>
                <Button variant="ghost" size="icon">
                  <InfoIcon className="size-4" />
                </Button>
              </TrayTrigger>
              <TrayContent>
                <TrayTitle>how to play</TrayTitle>
                <div className="prose-sm pt-2">
                  <p>
                    RIU (rack it up) is a weekly unicycling game where riders
                    upload sets of tricks and submit for other rider sets.
                  </p>
                  <p className="font-medium">scoring</p>
                  <ul>
                    <li>each set uploaded = 1 point</li>
                    <li>each submission uploaded = 1 point</li>
                  </ul>
                  <p className="font-medium">tiebreakers</p>
                  <ul>
                    <li>
                      riders with sets rank higher than riders with only
                      submissions
                    </li>
                    <li>
                      among riders with sets, whoever uploaded their last set
                      first wins — even if one rider has more submissions, the
                      last set time is what matters
                    </li>
                    <li>
                      if last set times are equal, whoever uploaded their last
                      submission first wins
                    </li>
                  </ul>
                </div>
              </TrayContent>
            </Tray>
          ) : null
        }
      />
      <Outlet />
    </div>
  )
}
