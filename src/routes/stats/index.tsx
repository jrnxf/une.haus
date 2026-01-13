import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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
    <div className="flex grow flex-col overflow-hidden">
      <div className="overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">stats</h1>
            <p className="text-muted-foreground text-sm">
              community activity at a glance
            </p>
          </div>

          <StatsGrid data={data} />
        </div>
      </div>
    </div>
  );
}
