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
import { useSiuBreadcrumbTrail } from "~/lib/games/sius/breadcrumbs"
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
  const { browseRoundId, setId, roundId, roundStatus } =
    useSiuBreadcrumbTrail(pathname)

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
          "focus-visible:ring-ring flex items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isCurrentPage
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground transition-colors",
        )}
      >
        {label}
        <ChevronDownIcon className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem render={<Link to="/games/rius">rack it up</Link>} />
        <DropdownMenuItem render={<Link to="/games/bius">back it up</Link>} />
        <DropdownMenuItem render={<Link to="/games/sius">stack it up</Link>} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
