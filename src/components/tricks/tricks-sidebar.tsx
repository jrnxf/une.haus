import { SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { Trick, TricksData } from "~/lib/tricks";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

type TricksSidebarProps = {
  data: TricksData;
  selectedTrickId: string | null;
  onSelectTrick: (trick: Trick) => void;
};

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function TricksSidebar({
  data,
  selectedTrickId,
  onSelectTrick,
}: TricksSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Filter tricks by search term
  const filteredByCategory = useMemo(() => {
    const result: Record<string, Trick[]> = {};
    const searchLower = deferredSearchTerm.toLowerCase();

    for (const category of data.categories) {
      // Skip prefixes in sidebar
      if (category === "prefix") continue;

      const categoryTricks = data.byCategory[category] ?? [];
      const filtered = searchLower
        ? categoryTricks.filter(
            (trick) =>
              trick.name.toLowerCase().includes(searchLower) ||
              trick.alternateNames.some((name) =>
                name.toLowerCase().includes(searchLower),
              ),
          )
        : categoryTricks;

      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }

    return result;
  }, [data, deferredSearchTerm]);

  const visibleCategories = Object.keys(filteredByCategory);

  // Default open categories (first 3 or all if searching)
  const defaultOpenCategories = deferredSearchTerm
    ? visibleCategories
    : visibleCategories.slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            className="h-9 pl-8 pr-8 text-sm"
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
              <XIcon className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Category list */}
      <ScrollArea className="flex-1">
        <Accordion
          className="px-3"
          defaultValue={defaultOpenCategories}
          type="multiple"
        >
          {visibleCategories.map((category) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="py-2 text-sm">
                <span className="flex items-center gap-2">
                  {formatCategory(category)}
                  <span className="text-muted-foreground text-xs">
                    ({filteredByCategory[category].length})
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="flex flex-col gap-0.5">
                  {filteredByCategory[category].map((trick) => (
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {visibleCategories.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">No tricks found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
