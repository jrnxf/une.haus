import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>back it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Outlet />
    </>
  )
}
