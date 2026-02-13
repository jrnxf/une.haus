import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayersIcon } from "lucide-react";

import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/games/sius")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb icon={LayersIcon}>stack it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <Outlet />
      </div>
    </>
  );
}
