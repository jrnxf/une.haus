import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import { PageHeader } from "~/components/page-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { games } from "~/lib/games"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
})

function getRiuRoundLink(roundId: string, status: string | undefined): string {
  if (status === "active") return "/games/rius/active"
  if (status === "upcoming") return "/games/rius/upcoming"
  return `/games/rius/archived/${roundId}`
}

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/rius" || pathname === "/games/rius/"
  const isActive = pathname.startsWith("/games/rius/active")
  const isUpcoming = pathname.startsWith("/games/rius/upcoming")
  const archivedId = pathname.match(/^\/games\/rius\/archived\/(\d+)/)?.[1]
  const setId = pathname.match(/^\/games\/rius\/sets\/(\d+)/)?.[1]
  const submissionId = pathname.match(/^\/games\/rius\/submissions\/(\d+)/)?.[1]

  const activeQuery = useQuery({
    ...games.rius.active.list.queryOptions(),
    enabled: isActive,
  })
  const upcomingQuery = useQuery({
    ...games.rius.upcoming.roster.queryOptions(),
    enabled: isUpcoming,
  })
  const setQuery = useQuery({
    ...games.rius.sets.get.queryOptions({ setId: Number(setId) }),
    enabled: Boolean(setId),
  })
  const submissionQuery = useQuery({
    ...games.rius.submissions.get.queryOptions({
      submissionId: Number(submissionId),
    }),
    enabled: Boolean(submissionId),
  })

  const roundId =
    archivedId ??
    (isActive ? activeQuery.data?.id?.toString() : undefined) ??
    (isUpcoming ? upcomingQuery.data?.round?.id?.toString() : undefined) ??
    setQuery.data?.riu.id?.toString() ??
    submissionQuery.data?.riuSet.riuId?.toString()

  const roundStatus = isActive
    ? "active"
    : isUpcoming
      ? "upcoming"
      : archivedId
        ? "archived"
        : (setQuery.data?.riu.status ?? submissionQuery.data?.riuSet.riu.status)

  const roundLink =
    roundId && roundStatus ? getRiuRoundLink(roundId, roundStatus) : undefined

  const isOnRoundPage = isActive || isUpcoming || Boolean(archivedId)

  return (
    <>
      <PageHeader maxWidth={isIndex ? "max-w-4xl" : "max-w-3xl"}>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <GameDropdown label="rius" isCurrentPage={isIndex} />
          {roundId &&
            (isOnRoundPage ? (
              <PageHeader.Crumb>{roundId}</PageHeader.Crumb>
            ) : (
              <PageHeader.Crumb to={roundLink}>{roundId}</PageHeader.Crumb>
            ))}
          {setId && [
            <PageHeader.Crumb key="sets" inert>
              sets
            </PageHeader.Crumb>,
            <PageHeader.Crumb key="set-id">{setId}</PageHeader.Crumb>,
          ]}
          {submissionId && [
            <PageHeader.Crumb key="submissions" inert>
              subs
            </PageHeader.Crumb>,
            <PageHeader.Crumb key="submission-id">
              {submissionId}
            </PageHeader.Crumb>,
          ]}
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Outlet />
    </>
  )
}

function GameDropdown({
  label,
  isCurrentPage,
}: {
  label: string
  isCurrentPage: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1 text-sm outline-none",
          isCurrentPage
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground transition-colors",
        )}
      >
        {label}
        <ChevronDownIcon className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem render={<Link to="/games/rius" />}>
          rack it up
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/games/bius" />}>
          back it up
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/games/sius" />}>
          stack it up
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
