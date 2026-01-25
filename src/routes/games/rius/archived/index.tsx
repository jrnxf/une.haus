import { createFileRoute, redirect } from "@tanstack/react-router";

import { games } from "~/lib/games";

export const Route = createFileRoute("/games/rius/archived/")({
  loader: async ({ context }) => {
    const archivedRius = await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    );

    if (archivedRius.length === 0) {
      return;
    }

    throw redirect({
      to: "/games/rius/archived/$riuId",
      params: { riuId: archivedRius[0].id.toString() },
      replace: true,
    });
  },
  component: EmptyArchive,
});

function EmptyArchive() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Archived</h2>
        <p className="text-muted-foreground text-sm">
          Previous rounds and their sets
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No archived rounds yet. Complete a round to see it here!
        </p>
      </div>
    </div>
  );
}
