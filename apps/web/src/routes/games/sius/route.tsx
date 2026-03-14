import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"

export const Route = createFileRoute("/games/sius")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>stack it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Outlet />
    </>
  )
}
