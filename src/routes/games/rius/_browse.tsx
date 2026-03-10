import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"
import pluralize from "pluralize"

import { ContentHeaderRow } from "~/components/content-header-row"
import { ContentHeaderDropdown } from "~/components/games/content-header-dropdown"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

export const Route = createFileRoute("/games/rius/_browse")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    )
  },
})

const sections = [
  { value: "archived", route: "/games/rius/archived" },
  { value: "active", route: "/games/rius/active" },
  { value: "upcoming", route: "/games/rius/upcoming" },
] as const

function RouteComponent() {
  const sessionUser = useSessionUser()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  )
  const currentSection =
    sections.find((s) => pathname.startsWith(s.route))?.value ??
    sections[0].value
  const upcomingRosterQuery = useQuery({
    ...games.rius.upcoming.roster.queryOptions(),
    enabled: currentSection === "upcoming",
  })
  const selectedArchivedRoundId =
    pathname.match(/^\/games\/rius\/archived\/(\d+)$/)?.[1] ??
    archivedRius[0]?.id.toString() ??
    ""
  const upcomingSetCount = Math.min(
    upcomingRosterQuery.data?.authUserSets?.length ?? 0,
    3,
  )
  const isUpcomingUploadLimitReached = upcomingSetCount >= 3
  const selectedArchivedRiu = archivedRius.find(
    (riu) => riu.id.toString() === selectedArchivedRoundId,
  )

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
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

            {currentSection === "archived" && archivedRius.length > 0 && (
              <ContentHeaderDropdown
                value={selectedArchivedRoundId}
                triggerLabel={
                  selectedArchivedRoundId
                    ? `round ${selectedArchivedRoundId}`
                    : "round"
                }
                options={[...archivedRius]
                  .toSorted((a, b) => b.id - a.id)
                  .map((riu) => ({
                    value: riu.id.toString(),
                    label: (
                      <span className="text-sm leading-tight font-medium lowercase">
                        round {riu.id}
                      </span>
                    ),
                    description: (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap lowercase">
                        {formatRiuDate(riu.createdAt)}
                        <span className="opacity-25">/</span>
                        {riu.setsCount} {pluralize("set", riu.setsCount)}
                        <span className="opacity-25">/</span>
                        {riu.submissionsCount}{" "}
                        {pluralize("submission", riu.submissionsCount)}
                      </span>
                    ),
                  }))}
                onValueChange={(value) => {
                  if (!value) return
                  navigate({
                    to: "/games/rius/archived/$riuId",
                    params: { riuId: value },
                  })
                }}
                align="end"
                contentClassName="max-h-[300px] overflow-y-auto w-fit min-w-max"
                triggerClassName="w-full sm:w-auto"
              />
            )}
          </div>
        }
        right={
          currentSection === "upcoming" ? (
            !sessionUser ? (
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
            ) : isUpcomingUploadLimitReached ? (
              <Button disabled className="relative gap-0 pr-7">
                upload
                <CountChip className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
                  {upcomingSetCount}/3
                </CountChip>
              </Button>
            ) : (
              <Button asChild className="relative">
                <Link to="/games/rius/upcoming/join">upload</Link>
                <CountChip className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
                  {upcomingSetCount}/3
                </CountChip>
              </Button>
            )
          ) : currentSection === "active" ? (
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
          ) : currentSection === "archived" && selectedArchivedRiu ? (
            <div className="text-muted-foreground text-xs">
              {formatRiuDate(selectedArchivedRiu.createdAt)}
            </div>
          ) : null
        }
      />
      <Outlet />
    </div>
  )
}

const formatRiuDate = (createdAt: Date | string) => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
