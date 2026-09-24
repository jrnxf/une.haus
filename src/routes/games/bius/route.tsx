import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"

import { GameDropdown } from "~/components/games/game-dropdown"
import { PageHeader } from "~/components/page-header"
import { useBiuBreadcrumbTrail } from "~/lib/games/bius/breadcrumbs"

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/bius" || pathname === "/games/bius/"
  const { browseRoundId, setId, roundId } = useBiuBreadcrumbTrail(pathname)

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
