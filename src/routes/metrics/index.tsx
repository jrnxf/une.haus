import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { StatsGrid } from "~/components/stats/stats-grid";
import { stats } from "~/lib/stats";

export const Route = createFileRoute("/metrics/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(stats.get.queryOptions());
  },
  staticData: {
    pageHeader: { breadcrumbs: [{ label: "metrics" }], maxWidth: "4xl" },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(stats.get.queryOptions());

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <StatsGrid data={data} />
    </div>
  );
}
