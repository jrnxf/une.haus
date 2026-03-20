import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"

export const Route = createFileRoute("/games/sius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/sius" || pathname === "/games/sius/"

  if (isIndex) {
    return (
      <>
        <PageHeader maxWidth="max-w-4xl">
          <PageHeader.Breadcrumbs>
            <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
            <PageHeader.Crumb>stack it up</PageHeader.Crumb>
          </PageHeader.Breadcrumbs>
        </PageHeader>
        <Outlet />
      </>
    )
  }

  const status = pathname.startsWith("/games/sius/archived")
    ? "archived"
    : "active"

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/sius">stack it up</PageHeader.Crumb>
          <PageHeader.Crumb>{status}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Outlet />
    </>
  )
}
