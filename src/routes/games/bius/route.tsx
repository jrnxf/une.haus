import { createFileRoute, Outlet } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>back it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <Outlet />
      </div>
    </>
  );
}
