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
import { useRiuBreadcrumbTrail } from "~/lib/games/rius/breadcrumbs"
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
  const { setId, submissionId, isOnRoundPage, roundId, roundStatus } =
    useRiuBreadcrumbTrail(pathname)

  const roundLink =
    roundId && roundStatus ? getRiuRoundLink(roundId, roundStatus) : undefined

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
