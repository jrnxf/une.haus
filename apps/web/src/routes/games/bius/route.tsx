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

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/bius" || pathname === "/games/bius/"
  const browseRoundId = pathname.match(/^\/games\/bius\/(\d+)/)?.[1]
  const setId = pathname.match(/^\/games\/bius\/sets\/(\d+)/)?.[1]

  const setQuery = useQuery({
    ...games.bius.sets.get.queryOptions({ setId: Number(setId) }),
    enabled: Boolean(setId),
  })

  const roundId = browseRoundId ?? setQuery.data?.biu.id?.toString()

  return (
    <>
      <PageHeader maxWidth={isIndex ? "max-w-4xl" : "max-w-3xl"}>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <GameDropdown label="bius" isCurrentPage={isIndex} />
          {roundId &&
            (browseRoundId ? (
              <PageHeader.Crumb>{roundId}</PageHeader.Crumb>
            ) : (
              <PageHeader.Crumb to={`/games/bius/${roundId}`}>
                {roundId}
              </PageHeader.Crumb>
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
