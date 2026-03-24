import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
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

function RouteComponent() {
  const { sessionUser, authGate } = useAuthGate()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const { data: upcomingRoster } = useSuspenseQuery(
    games.rius.upcoming.roster.queryOptions(),
  )

  const isUpcoming = pathname.startsWith("/games/rius/upcoming")
  const isActive = pathname.startsWith("/games/rius/active")

  const upcomingSetCount = Math.min(upcomingRoster.authUserSets?.length ?? 0, 3)
  const isUpcomingUploadLimitReached = upcomingSetCount >= 3

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <ContentHeaderRow
        className="max-w-none pb-4"
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
