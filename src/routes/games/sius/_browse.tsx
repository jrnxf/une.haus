import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router"

import { ContentHeaderRow } from "~/components/content-header-row"
import { ContentHeaderDropdown } from "~/components/games/content-header-dropdown"
import { ArchiveVoteButton } from "~/components/games/sius/archive-vote-button"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

export const Route = createFileRoute("/games/sius/_browse")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )
  },
})

const sections = [
  { value: "archived", route: "/games/sius/archived" },
  { value: "active", route: "/games/sius" },
] as const

const fmt = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatRoundDates = (
  createdAt: Date | string,
  endedAt: Date | string | null,
) => {
  const start = fmt(createdAt)
  const end = endedAt ? fmt(endedAt) : "present"
  return `${start} – ${end}`
}

function RouteComponent() {
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )
  const sessionUser = useSessionUser()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const params = useParams({ strict: false }) as { roundId?: number }
  const selectedRoundId = params.roundId
  const isArchived = pathname.startsWith("/games/sius/archived")
  const isActive = !isArchived && selectedRoundId !== undefined
  const currentSection = isArchived ? "archived" : "active"
  const selectedRound = rounds.find((c) => c.id === Number(selectedRoundId))
  const activeSets = (selectedRound?.sets ?? []).filter((set) => !set.deletedAt)
  const latestSet = activeSets[0]
  const voteCount = selectedRound?.archiveVotes?.length ?? 0
  const hasVoted =
    sessionUser &&
    selectedRound?.archiveVotes?.some((v) => v.user.id === sessionUser.id)
  const canAddSet =
    sessionUser &&
    latestSet &&
    latestSet.user.id !== sessionUser.id &&
    selectedRound?.status === "active"
  const selectedGameIndex = rounds.findIndex(
    (c) => c.id === Number(selectedRoundId),
  )

  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
        left={
          <div className="flex flex-wrap items-center gap-2">
            <ContentHeaderDropdown
              value={currentSection}
              triggerLabel={currentSection}
              options={sections.map((section) => ({
                value: section.value,
                label: section.value,
              }))}
              onValueChange={(value) => {
                const section = sections.find((s) => s.value === value)
                if (section) navigate({ to: section.route })
              }}
              triggerClassName="w-full sm:w-auto"
            />

            {isActive && rounds.length > 1 && selectedRoundId !== undefined && (
              <ContentHeaderDropdown
                value={String(selectedRoundId)}
                triggerLabel={`game ${selectedGameIndex + 1}`}
                options={rounds.map((round, index) => ({
                  value: String(round.id),
                  label: `game ${index + 1}`,
                }))}
                onValueChange={(value) =>
                  navigate({
                    to: "/games/sius/$roundId",
                    params: { roundId: Number(value) },
                    replace: true,
                  })
                }
              />
            )}

            {isArchived && selectedRoundId !== undefined && (
              <ArchivedRoundSelector
                selectedRoundId={Number(selectedRoundId)}
              />
            )}
          </div>
        }
        right={
          isActive &&
          selectedRound &&
          latestSet &&
          selectedRound.status === "active" ? (
            <div className="flex items-center gap-2">
              {canAddSet ? (
                <Button asChild>
                  <Link
                    to="/games/sius/$siuId/upload"
                    params={{ siuId: selectedRound.id }}
                  >
                    upload
                  </Link>
                </Button>
              ) : sessionUser ? (
                latestSet.user.id === sessionUser.id ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button disabled>upload</Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      you can&apos;t stack your own trick
                    </TooltipContent>
                  </Tooltip>
                ) : null
              ) : (
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
              )}

              {sessionUser && (
                <ArchiveVoteButton
                  roundId={selectedRound.id}
                  voteCount={voteCount}
                  hasVoted={!!hasVoted}
                />
              )}
            </div>
          ) : null
        }
      />
      <Outlet />
    </div>
  )
}

function ArchivedRoundSelector({
  selectedRoundId,
}: {
  selectedRoundId: number
}) {
  const navigate = useNavigate()
  const { data: archivedRounds } = useSuspenseQuery(
    games.sius.rounds.archived.list.queryOptions(),
  )

  if (archivedRounds.length <= 1) return null

  const selected = archivedRounds.find((s) => s.id === selectedRoundId)

  return (
    <ContentHeaderDropdown
      value={String(selectedRoundId)}
      triggerLabel={`round ${selected?.id ?? selectedRoundId}`}
      options={[...archivedRounds]
        .toSorted((a, b) => {
          const aEnd = a.endedAt ? new Date(a.endedAt).getTime() : Date.now()
          const bEnd = b.endedAt ? new Date(b.endedAt).getTime() : Date.now()
          return bEnd - aEnd
        })
        .map((round) => ({
          value: String(round.id),
          label: (
            <span className="leading-tight font-medium lowercase">
              round {round.id}
            </span>
          ),
          description: (
            <span className="lowercase">
              {formatRoundDates(round.createdAt, round.endedAt)}
            </span>
          ),
        }))}
      onValueChange={(value) => {
        if (!value) return
        navigate({
          to: "/games/sius/archived/$roundId",
          params: { roundId: value },
        })
      }}
      align="end"
      contentClassName="max-h-[300px]"
    />
  )
}
