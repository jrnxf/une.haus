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

export const Route = createFileRoute("/games/sius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/sius" || pathname === "/games/sius/"
  const roundId = pathname.match(/^\/games\/sius\/(?:archived\/)?(\d+)/)?.[1]

  return (
    <>
      <PageHeader maxWidth={isIndex ? "max-w-4xl" : "max-w-3xl"}>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <GameDropdown label="stack it up" isCurrentPage={isIndex} />
          {roundId && <PageHeader.Crumb>{roundId}</PageHeader.Crumb>}
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
