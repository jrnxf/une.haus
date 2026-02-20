import pluralize from "pluralize";

import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import type { Trick } from "~/lib/tricks";
import { cn } from "~/lib/utils";

import { TrickCard } from "./trick-card";

type ElementLaneProps = {
  element: string;
  tricks: Trick[];
  selectedTrickId?: string;
  onSelectTrick: (trick: Trick) => void;
};

// Format element for display
function formatElement(element: string): string {
  return element.charAt(0).toUpperCase() + element.slice(1);
}

// Group tricks by depth for visual separation
function groupByDepth(tricks: Trick[]): Map<number, Trick[]> {
  const groups = new Map<number, Trick[]>();
  for (const trick of tricks) {
    const existing = groups.get(trick.depth) ?? [];
    existing.push(trick);
    groups.set(trick.depth, existing);
  }
  return groups;
}

export function ElementLane({
  element,
  tricks,
  selectedTrickId,
  onSelectTrick,
}: ElementLaneProps) {
  const depthGroups = groupByDepth(tricks);
  const maxDepth = Math.max(...tricks.map((t) => t.depth));

  return (
    <div className="space-y-2">
      {/* Sticky header */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex items-center gap-2 py-2 backdrop-blur">
        <h2 className="text-lg font-semibold">{formatElement(element)}</h2>
        <span className="text-muted-foreground text-sm">
          ({tricks.length} {pluralize("trick", tricks.length)})
        </span>
      </div>

      {/* Horizontal scrolling lane */}
      <ScrollArea className="w-full">
        <div className="flex gap-6 pb-4">
          {/* Group by depth for visual progression */}
          {Array.from({ length: maxDepth + 1 }, (_, depth) => {
            const depthTricks = depthGroups.get(depth) ?? [];
            if (depthTricks.length === 0) return null;

            return (
              <div className="flex flex-col gap-2" key={depth}>
                {/* Depth indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-1 w-8 rounded-full",
                      depth === 0
                        ? "bg-green-500"
                        : depth <= 2
                          ? "bg-yellow-500"
                          : depth <= 4
                            ? "bg-orange-500"
                            : "bg-red-500",
                    )}
                  />
                  <span className="text-muted-foreground text-xs">
                    {depth === 0 ? "Start" : `Depth ${depth}`}
                  </span>
                </div>

                {/* Trick cards at this depth */}
                <div className="flex flex-wrap gap-2">
                  {depthTricks.map((trick) => (
                    <TrickCard
                      compact
                      isSelected={selectedTrickId === trick.id}
                      key={trick.id}
                      onSelect={onSelectTrick}
                      trick={trick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
