import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { ContentHeaderDropdown } from "~/components/games/content-header-dropdown"
import { ArchiveVoteButton } from "~/components/games/sius/archive-vote-button"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { useAuthGate } from "~/hooks/use-auth-gate"
import { games } from "~/lib/games"

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
  const { sessionUser, authGate } = useAuthGate()
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
    <div className="mx-auto w-full max-w-3xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
        left={
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            {isActive &&
              selectedRound &&
              latestSet &&
              selectedRound.status === "active" && (
                <>
                  {canAddSet ? (
                    <Button asChild>
                      <Link
                        to="/games/sius/$siuId/upload"
                        params={{ siuId: selectedRound.id }}
                      >
                        upload
                      </Link>
                    </Button>
                  ) : sessionUser && latestSet.user.id === sessionUser.id ? (
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
                  ) : !sessionUser ? (
                    <Button
                      onClick={() =>
                        authGate(() =>
                          navigate({
                            to: "/games/sius/$siuId/upload",
                            params: { siuId: selectedRound.id },
                          }),
                        )
                      }
                    >
                      upload
                    </Button>
                  ) : null}

                  <ArchiveVoteButton
                    roundId={selectedRound.id}
                    voteCount={voteCount}
                    hasVoted={Boolean(hasVoted)}
                  />
                </>
              )}
            {isActive && <SiuInfoTray />}
          </div>
        }
      />
      <Outlet />
    </div>
  )
}

function SiuInfoTray() {
  return (
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
            SIU (stack it up) is a trick line game. a rider uploads a trick, and
            the next rider must land every trick before it plus a new one — all
            in a single line.
          </p>
          <p className="font-medium">how submissions work</p>
          <ul>
            <li>
              each submission must include all previous tricks in order plus
              your new trick, filmed in one continuous line
            </li>
            <li>
              as the stack grows, the line gets longer and harder — every trick
              from the history must be performed
            </li>
          </ul>
          <p className="font-medium">when does it end?</p>
          <p>
            when enough riders find the stack too difficult to continue, they
            vote to archive. after five archive votes, an admin is notified and
            the round ends.
          </p>
        </div>
      </TrayContent>
    </Tray>
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
