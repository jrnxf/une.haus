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
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/rius" || pathname === "/games/rius/"
  const archivedId = pathname.match(/^\/games\/rius\/archived\/(\d+)/)?.[1]
  const label = archivedId
    ? archivedId
    : pathname.startsWith("/games/rius/upcoming")
      ? "upcoming"
      : pathname.startsWith("/games/rius/active")
        ? "active"
        : null

  return (
    <>
      <PageHeader maxWidth={isIndex ? "max-w-4xl" : "max-w-3xl"}>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <GameDropdown label="rack it up" isCurrentPage={isIndex} />
          {label && <PageHeader.Crumb>{label}</PageHeader.Crumb>}
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
