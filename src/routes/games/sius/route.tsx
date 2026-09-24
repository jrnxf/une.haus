import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"

import { GameDropdown } from "~/components/games/game-dropdown"
import { PageHeader } from "~/components/page-header"
import { useSiuBreadcrumbTrail } from "~/lib/games/sius/breadcrumbs"

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
