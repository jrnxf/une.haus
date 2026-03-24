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
  const { sessionUser, authGate } = useAuthGate()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const params = useParams({ strict: false }) as { roundId?: number }
  const selectedRoundId = params.roundId
  const isArchived = pathname.startsWith("/games/sius/archived")
  const isActive = !isArchived && selectedRoundId !== undefined
  const selectedRound = activeRounds.find(
    (c) => c.id === Number(selectedRoundId),
  )
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

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
        right={
          <div className="flex items-center gap-2">
            {isActive && selectedRound && (
              <ArchiveVoteButton
                roundId={selectedRound.id}
                voteCount={voteCount}
                hasVoted={Boolean(hasVoted)}
              />
            )}
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
