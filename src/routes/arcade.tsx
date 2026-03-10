import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { UnicycleGame } from "~/components/unicycle-game/unicycle-game"

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
