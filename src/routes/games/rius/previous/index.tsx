import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarIcon, ChevronDown, HashIcon } from "lucide-react";
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
  riuId: z.number().optional(),
  open: z.number().optional(),
});

export const Route = createFileRoute("/games/rius/previous/")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ riuId: search.riuId }),
  loader: async ({ context, deps }) => {
    const archivedRius = await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    );

    if (archivedRius.length === 0) return;

    const riuId = deps.riuId ?? archivedRius[0].id;

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

function EmptyArchive() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Archive</h2>
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

function ArchiveContent({
  archivedRius,
  selectedRiuId,
  open,
}: {
  archivedRius: { id: number; createdAt: Date; setsCount: number }[];
  selectedRiuId: number;
  open?: number;
}) {
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
          <h2 className="text-lg font-semibold">Archive</h2>
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
              className="w-full justify-between gap-3 sm:w-auto"
            >
              <div className="flex items-center gap-2">
                <HashIcon className="text-muted-foreground size-4" />
                <span>Round {selectedRiu?.id}</span>
              </div>
              <ChevronDown className="text-muted-foreground size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="max-h-[300px] overflow-y-auto">
              {archivedRius.map((riu) => (
                <DropdownMenuItem key={riu.id} asChild>
                  <Link
                    to="/games/rius/previous"
                    search={{ riuId: riu.id }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <HashIcon className="text-muted-foreground size-3.5" />
                      <span className="font-medium">Round {riu.id}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <CalendarIcon className="size-3" />
                      {formatRiuDate(riu.createdAt)}
                    </div>
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
          basePath="/games/rius/previous"
          searchParams={{ riuId: selectedRiuId }}
        />
      )}
    </div>
  );
}

function RouteComponent() {
  const { riuId: searchRiuId, open } = Route.useSearch();

  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  );

  if (archivedRius.length === 0) {
    return <EmptyArchive />;
  }

  const selectedRiuId = searchRiuId ?? archivedRius[0].id;

  return (
    <ArchiveContent
      archivedRius={archivedRius}
      selectedRiuId={selectedRiuId}
      open={open}
    />
  );
}
