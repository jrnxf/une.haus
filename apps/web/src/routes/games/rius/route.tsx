import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const status = pathname.startsWith("/games/rius/archived")
    ? "archived"
    : pathname.startsWith("/games/rius/upcoming")
      ? "upcoming"
      : "active"

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/rius/active">
            rack it up
          </PageHeader.Crumb>
          <PageHeader.Crumb>{status}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Outlet />
    </>
  )
}
