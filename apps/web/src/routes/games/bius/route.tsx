import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isIndex = pathname === "/games/bius" || pathname === "/games/bius/"

  if (isIndex) {
    return (
      <>
        <PageHeader maxWidth="max-w-4xl">
          <PageHeader.Breadcrumbs>
            <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
            <PageHeader.Crumb>back it up</PageHeader.Crumb>
          </PageHeader.Breadcrumbs>
        </PageHeader>
        <Outlet />
      </>
    )
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/bius">back it up</PageHeader.Crumb>
          <PageHeader.Crumb>active</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Outlet />
    </>
  )
}
