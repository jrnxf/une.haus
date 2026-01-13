import { SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Trick, TricksData } from "~/lib/tricks";

import { CategoryLane } from "./category-lane";
import { TrickDetail } from "./trick-detail";

type SkillTreeProps = {
  data: TricksData;
};

export function SkillTree({ data }: SkillTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    new Set(["prefix"]), // Hide prefixes by default
  );

  // Filter tricks by search term
  const filteredByCategory = useMemo(() => {
    const result: Record<string, Trick[]> = {};
    const searchLower = deferredSearchTerm.toLowerCase();

    for (const category of data.categories) {
      if (hiddenCategories.has(category)) continue;

      const categoryTricks = data.byCategory[category] ?? [];
      const filtered = searchLower
        ? categoryTricks.filter(
            (trick) =>
              trick.name.toLowerCase().includes(searchLower) ||
              trick.alternateNames.some((name) =>
                name.toLowerCase().includes(searchLower),
              ) ||
              trick.definition.toLowerCase().includes(searchLower),
          )
        : categoryTricks;

      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }

    return result;
  }, [data, deferredSearchTerm, hiddenCategories]);

  const visibleCategories = Object.keys(filteredByCategory);
  const totalTricksShown = Object.values(filteredByCategory).reduce(
    (sum, tricks) => sum + tricks.length,
    0,
  );

  const selectedTrick = selectedTrickId ? data.byId[selectedTrickId] : null;

  function toggleCategory(category: string) {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
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
            placeholder="Search tricks..."
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

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {data.categories.map((category) => {
            const isHidden = hiddenCategories.has(category);
            const count = data.byCategory[category]?.length ?? 0;

            return (
              <Badge
                className="cursor-pointer select-none"
                key={category}
                onClick={() => toggleCategory(category)}
                variant={isHidden ? "outline" : "secondary"}
              >
                {category}
                <span className="text-muted-foreground ml-1">({count})</span>
              </Badge>
            );
          })}
        </div>

        {/* Stats */}
        <p className="text-muted-foreground text-sm">
          Showing {totalTricksShown} tricks across {visibleCategories.length}{" "}
          categories
        </p>
      </div>

      {/* Category lanes */}
      <div className="space-y-8">
        {visibleCategories.map((category) => (
          <CategoryLane
            category={category}
            key={category}
            onSelectTrick={handleSelectTrick}
            selectedTrickId={selectedTrickId ?? undefined}
            tricks={filteredByCategory[category]}
          />
        ))}
      </div>

      {/* Empty state */}
      {visibleCategories.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No tricks found matching your search.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setSearchTerm("");
              setHiddenCategories(new Set(["prefix"]));
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
