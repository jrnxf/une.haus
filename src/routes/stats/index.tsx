import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { StatsGrid } from "~/components/stats/stats-grid";
import { stats } from "~/lib/stats";

export const Route = createFileRoute("/stats/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(stats.get.queryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(stats.get.queryOptions());

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>stats</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <StatsGrid data={data} />
      </div>
    </>
  );
}
