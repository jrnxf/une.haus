import { createFileRoute } from "@tanstack/react-router"

import { UnicycleGame } from "~/components/arcade/arcade"
import { PageHeader } from "~/components/page-header"

export const Route = createFileRoute("/arcade")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>arcade</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <UnicycleGame />
    </>
  )
}
