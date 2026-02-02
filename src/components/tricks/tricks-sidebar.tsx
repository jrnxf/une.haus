import { useDeferredValue, useMemo, useState } from "react";

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
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

  function handleSelect(trickId: string) {
    const trick = data.byId[trickId];
    if (trick) {
      onSelectTrick(trick);
    }
  }

  return (
    <Command
      shouldFilter={false}
      value={selectedTrickId ?? undefined}
      className="bg-background h-full rounded-none"
    >
      <CommandInput
        onValueChange={setSearchTerm}
        placeholder="search tricks..."
        value={searchTerm}
      />
      <CommandList className="max-h-none flex-1">
        {filteredTricks.length === 0 && (
          <p className="text-muted-foreground py-3 text-center text-sm">
            No tricks found.
          </p>
        )}
        <CommandGroup className="pb-0">
          {filteredTricks.map((trick) => (
            <CommandItem
              key={trick.id}
              value={trick.id}
              onSelect={() => handleSelect(trick.id)}
              className={cn(
                "text-sm",
                selectedTrickId === trick.id && "bg-primary/10 text-primary",
              )}
            >
              {trick.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
