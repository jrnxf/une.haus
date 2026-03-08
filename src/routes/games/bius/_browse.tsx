import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router"

import { ContentHeaderRow } from "~/components/content-header-row"
import { ContentHeaderDropdown } from "~/components/games/content-header-dropdown"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

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
  const sessionUser = useSessionUser()
  const selectedRoundId = params.roundId
  const round = rounds.find((c) => c.id === Number(selectedRoundId))
  const latestSet = round?.sets?.[0]
  const canBackUp =
    sessionUser && latestSet && latestSet.user.id !== sessionUser.id
  const selectedGameIndex = rounds.findIndex(
    (c) => c.id === Number(selectedRoundId),
  )

  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
        left={
          latestSet ? (
            canBackUp ? (
              <Button asChild>
                <Link
                  to="/games/bius/$biuId/upload"
                  params={{ biuId: round!.id }}
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
                    you can&apos;t back up your own set
                  </TooltipContent>
                </Tooltip>
              ) : null
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button disabled>upload</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>log in to back it up</TooltipContent>
              </Tooltip>
            )
          ) : null
        }
        right={
          rounds.length > 1 &&
          selectedRoundId !== undefined && (
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
          )
        }
      />
      <Outlet />
    </div>
  )
}
