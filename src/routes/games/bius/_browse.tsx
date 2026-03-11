import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { ContentHeaderDropdown } from "~/components/games/content-header-dropdown"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { useAuthGate } from "~/hooks/use-auth-gate"
import { games } from "~/lib/games"

export const Route = createFileRoute("/games/bius/_browse")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(games.bius.rounds.queryOptions())
  },
})

function RouteComponent() {
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { roundId?: number }
  const { sessionUser, authGate } = useAuthGate()
  const selectedRoundId = params.roundId
  const round = rounds.find((c) => c.id === Number(selectedRoundId))
  const latestSet = round?.sets?.[0]
  const canBackUp =
    sessionUser && latestSet && latestSet.user.id !== sessionUser.id
  const selectedGameIndex = rounds.findIndex(
    (c) => c.id === Number(selectedRoundId),
  )

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
        left={
          <div className="flex items-center gap-2">
            {rounds.length > 1 && selectedRoundId !== undefined && (
              <ContentHeaderDropdown
                value={String(selectedRoundId)}
                triggerLabel={`game ${selectedGameIndex + 1}`}
                options={rounds.map((round, index) => ({
                  value: String(round.id),
                  label: `game ${index + 1}`,
                }))}
                onValueChange={(value) =>
                  navigate({
                    to: "/games/bius/$roundId",
                    params: { roundId: Number(value) },
                    replace: true,
                  })
                }
              />
            )}
          </div>
        }
        right={
          <div className="flex items-center gap-2">
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
                    BIU (back it up) is a trick line game. a rider uploads a
                    trick, and the next rider must land that trick plus a new
                    one in a single line.
                  </p>
                  <p className="font-medium">how submissions work</p>
                  <ul>
                    <li>
                      each submission must include the previous trick and your
                      new trick filmed in one continuous line
                    </li>
                    <li>
                      only the most recent trick carries forward — you don't
                      need to do every trick from the history, just the last one
                      plus yours
                    </li>
                  </ul>
                  <p className="font-medium">when does it end?</p>
                  <p>
                    it doesn't — the game continues indefinitely as riders keep
                    backing it up with new tricks.
                  </p>
                </div>
              </TrayContent>
            </Tray>
            {latestSet ? (
              canBackUp ? (
                <Button asChild>
                  <Link
                    to="/games/bius/$biuId/upload"
                    params={{ biuId: round!.id }}
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
                    you can&apos;t back up your own set
                  </TooltipContent>
                </Tooltip>
              ) : !sessionUser ? (
                <Button
                  onClick={() =>
                    authGate(() =>
                      navigate({
                        to: "/games/bius/$biuId/upload",
                        params: { biuId: round!.id },
                      }),
                    )
                  }
                >
                  upload
                </Button>
              ) : null
            ) : null}
          </div>
        }
      />
      <Outlet />
    </div>
  )
}
