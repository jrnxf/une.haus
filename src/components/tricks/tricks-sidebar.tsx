import { SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { Trick, TricksData } from "~/lib/tricks";
import { cn } from "~/lib/utils";

type TricksSidebarProps = {
  data: TricksData;
  selectedTrickId: string | null;
  onSelectTrick: (trick: Trick) => void;
};

export function TricksSidebar({
  data,
  selectedTrickId,
  onSelectTrick,
}: TricksSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Filter and sort tricks by search term
  const filteredTricks = useMemo(() => {
    const searchLower = deferredSearchTerm.toLowerCase();

    const filtered = searchLower
      ? data.tricks.filter(
          (trick) =>
            trick.name.toLowerCase().includes(searchLower) ||
            trick.alternateNames.some((name) =>
              name.toLowerCase().includes(searchLower),
            ),
        )
      : data.tricks;

    // Sort alphabetically by name
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.tricks, deferredSearchTerm]);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            className="h-9 pr-8 pl-8 text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tricks..."
            type="search"
            value={searchTerm}
          />
          {searchTerm && (
            <Button
              aria-label="Clear search"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => setSearchTerm("")}
              size="icon-xs"
              variant="ghost"
            >
              <XIcon className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Tricks list */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="flex flex-col gap-0.5 p-3">
          {filteredTricks.map((trick) => (
            <button
              className={cn(
                "rounded px-2 py-1 text-left text-sm transition-colors",
                "hover:bg-accent",
                selectedTrickId === trick.id &&
                  "bg-primary/10 text-primary",
              )}
              key={trick.id}
              onClick={() => onSelectTrick(trick)}
              type="button"
            >
              {trick.name}
            </button>
          ))}
        </div>

        {filteredTricks.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">No tricks found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
