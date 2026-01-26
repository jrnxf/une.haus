import { SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Trick, TricksData } from "~/lib/tricks";

import { ElementLane } from "./element-lane";
import { TrickDetail } from "./trick-detail";

type SkillTreeProps = {
  data: TricksData;
};

export function SkillTree({ data }: SkillTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(null);
  const [hiddenElements, setHiddenElements] = useState<Set<string>>(
    new Set(["prefix"]), // Hide prefixes by default
  );

  // Filter tricks by search term
  const filteredByElement = useMemo(() => {
    const result: Record<string, Trick[]> = {};
    const searchLower = deferredSearchTerm.toLowerCase();

    for (const element of data.elements) {
      if (hiddenElements.has(element)) continue;

      const elementTricks = data.byElement[element] ?? [];
      const filtered = searchLower
        ? elementTricks.filter(
            (trick) =>
              trick.name.toLowerCase().includes(searchLower) ||
              trick.alternateNames.some((name) =>
                name.toLowerCase().includes(searchLower),
              ) ||
              trick.definition.toLowerCase().includes(searchLower),
          )
        : elementTricks;

      if (filtered.length > 0) {
        result[element] = filtered;
      }
    }

    return result;
  }, [data, deferredSearchTerm, hiddenElements]);

  const visibleElements = Object.keys(filteredByElement);
  const totalTricksShown = Object.values(filteredByElement).reduce(
    (sum, tricks) => sum + tricks.length,
    0,
  );

  const selectedTrick = selectedTrickId ? data.byId[selectedTrickId] : null;

  function toggleElement(element: string) {
    setHiddenElements((prev) => {
      const next = new Set(prev);
      if (next.has(element)) {
        next.delete(element);
      } else {
        next.add(element);
      }
      return next;
    });
  }

  function handleSelectTrick(trick: Trick) {
    setSelectedTrickId(trick.id);
  }

  function handleNavigateToTrick(trickId: string) {
    setSelectedTrickId(trickId);
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pr-9 pl-9"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="search tricks..."
            type="search"
            value={searchTerm}
          />
          {searchTerm && (
            <Button
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => setSearchTerm("")}
              size="icon-xs"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>

        {/* Element filters */}
        <div className="flex flex-wrap gap-2">
          {data.elements.map((element) => {
            const isHidden = hiddenElements.has(element);
            const count = data.byElement[element]?.length ?? 0;

            return (
              <Badge
                className="cursor-pointer select-none"
                key={element}
                onClick={() => toggleElement(element)}
                variant={isHidden ? "outline" : "secondary"}
              >
                {element}
                <span className="text-muted-foreground ml-1">({count})</span>
              </Badge>
            );
          })}
        </div>

        {/* Stats */}
        <p className="text-muted-foreground text-sm">
          Showing {totalTricksShown} tricks across {visibleElements.length}{" "}
          elements
        </p>
      </div>

      {/* Element lanes */}
      <div className="space-y-6">
        {visibleElements.map((element) => (
          <ElementLane
            element={element}
            key={element}
            onSelectTrick={handleSelectTrick}
            selectedTrickId={selectedTrickId ?? undefined}
            tricks={filteredByElement[element]}
          />
        ))}
      </div>

      {/* Empty state */}
      {visibleElements.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No tricks found matching your search.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setSearchTerm("");
              setHiddenElements(new Set(["prefix"]));
            }}
            variant="outline"
          >
            Reset filters
          </Button>
        </div>
      )}

      {/* Trick detail dialog */}
      {selectedTrick && (
        <TrickDetail
          onNavigateToTrick={handleNavigateToTrick}
          onOpenChange={(open) => !open && setSelectedTrickId(null)}
          open
          trick={selectedTrick}
          tricksData={data}
        />
      )}
    </div>
  );
}
