import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { UnicycleGame } from "~/components/unicycle-game";

export const Route = createFileRoute("/games/arcade")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>arcade</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <UnicycleGame />
    </>
  );
}
