import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { z } from "zod";

import { SetsGroupedList } from "~/components/games/sets-grouped-list";
import { games, groupSetsByUserWithRankings } from "~/lib/games";
import { messages } from "~/lib/messages";

const searchSchema = z.object({
  open: z.number().optional(),
});

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const activeRiuData = await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );

    const messagePromises = activeRiuData.sets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    );

    await Promise.all(messagePromises);
  },
});

function RouteComponent() {
  const { open } = Route.useSearch();
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions());

  const rankedRiders = useMemo(
    () => groupSetsByUserWithRankings(data.sets),
    [data.sets],
  );

  const participantCount = rankedRiders.length;
  const setCount = data.sets.length;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">round #{data.id}</h2>
          <p className="text-muted-foreground text-sm">
            {participantCount} {participantCount === 1 ? "player" : "players"} ·{" "}
            {setCount} {setCount === 1 ? "set" : "sets"}
          </p>
        </div>
      </div>

      {/* Sets Grid/List */}
      {data.sets.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            No active sets yet. Check back soon!
          </p>
        </div>
      ) : (
        <SetsGroupedList
          rankedRiders={rankedRiders}
          openUserId={open}
          basePath="/games/rius/active"
        />
      )}
    </div>
  );
}
