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

export const Route = createFileRoute("/games/sius")({
  component: RouteComponent,
})

function getSiuRoundLink(roundId: string, status: string | undefined): string {
  if (status === "archived") return `/games/sius/archived/${roundId}`
  return `/games/sius/${roundId}`
}

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/sius" || pathname === "/games/sius/"
  const activeRoundId = pathname.match(/^\/games\/sius\/(\d+)/)?.[1]
  const archivedRoundId = pathname.match(/^\/games\/sius\/archived\/(\d+)/)?.[1]
  const browseRoundId = archivedRoundId ?? activeRoundId
  const setId = pathname.match(/^\/games\/sius\/sets\/(\d+)/)?.[1]

  const setQuery = useQuery({
    ...games.sius.sets.get.queryOptions({ setId: Number(setId) }),
    enabled: Boolean(setId),
  })

  const roundId = browseRoundId ?? setQuery.data?.siu.id?.toString()

  const roundStatus = archivedRoundId
    ? "archived"
    : activeRoundId
      ? "active"
      : setQuery.data?.siu.status

  const roundLink =
    roundId && roundStatus ? getSiuRoundLink(roundId, roundStatus) : undefined

  const isOnRoundPage = Boolean(browseRoundId)

  return (
    <>
      <PageHeader maxWidth={isIndex ? "max-w-4xl" : "max-w-3xl"}>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <GameDropdown label="sius" isCurrentPage={isIndex} />
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
