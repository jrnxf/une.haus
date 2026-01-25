import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

import { SetsGroupedList } from "~/components/games/sets-grouped-list";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { games, groupSetsByUserWithRankings } from "~/lib/games";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";

const formatRiuDate = (createdAt: Date | string) => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const searchSchema = z.object({
  open: z.number().optional(),
});

export const Route = createFileRoute("/games/rius/archived/$riuId")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context, params }) => {
    const riuId = Number.parseInt(params.riuId, 10);

    await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    );

    const riu = await context.queryClient.ensureQueryData(
      games.rius.archived.get.queryOptions({ riuId }),
    );

    invariant(riu, "RIU not found");

    const allSets = riu.sets;
    const messagePromises = allSets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    );

    await Promise.all(messagePromises);
  },
});

function RouteComponent() {
  const { riuId } = Route.useParams();
  const { open } = Route.useSearch();
  const selectedRiuId = Number.parseInt(riuId, 10);

  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  );

  const { data: selectedRiu } = useSuspenseQuery(
    games.rius.archived.get.queryOptions({ riuId: selectedRiuId }),
  );

  const rankedRiders = useMemo(() => {
    if (!selectedRiu) return [];
    return groupSetsByUserWithRankings(selectedRiu.sets);
  }, [selectedRiu]);

  const participantCount = rankedRiders.length;
  const setCount = selectedRiu?.sets.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Archived</h2>
          <p className="text-muted-foreground text-sm">
            {participantCount} {participantCount === 1 ? "player" : "players"} ·{" "}
            {setCount} {setCount === 1 ? "set" : "sets"}
          </p>
        </div>

        {/* Round Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between gap-2 sm:w-auto"
            >
              <span>round {selectedRiu?.id}</span>
              <ChevronDown className="text-muted-foreground size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="max-h-[300px] overflow-y-auto">
              {[...archivedRius]
                .sort((a, b) => b.id - a.id)
                .map((riu) => (
                  <DropdownMenuItem key={riu.id} asChild>
                    <Link
                      to="/games/rius/archived/$riuId"
                      params={{ riuId: riu.id.toString() }}
                      className="flex flex-col items-start"
                    >
                      <span className="font-medium lowercase leading-tight">round {riu.id}</span>
                      <span className="text-muted-foreground text-xs lowercase leading-tight">
                        {formatRiuDate(riu.createdAt)}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sets List */}
      {selectedRiu && rankedRiders.length > 0 && (
        <SetsGroupedList
          rankedRiders={rankedRiders}
          openUserId={open}
          basePath="/games/rius/archived/$riuId"
          pathParams={{ riuId: riuId }}
        />
      )}
    </div>
  );
}
