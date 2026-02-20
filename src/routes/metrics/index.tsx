import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { StatsGrid } from "~/components/stats/stats-grid";
import { stats } from "~/lib/stats";

import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/metrics/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(stats.get.queryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(stats.get.queryOptions());

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>metrics</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <StatsGrid data={data} />
      </div>
    </>
  );
}
