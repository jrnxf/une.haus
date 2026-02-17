import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { cn } from "~/lib/utils";

export type SidebarTrick = {
  id: string;
  name: string;
  isCompound: boolean;
  alternateNames?: string[] | null;
};

type TricksSidebarProps<T extends SidebarTrick> = {
  tricks: T[];
  selectedId: string | null;
  onSelect: (trick: T) => void;
};

export function TricksSidebar<T extends SidebarTrick>({
  tricks,
  selectedId,
  onSelect,
}: TricksSidebarProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const sortedTricks = useMemo(() => {
    const sorted = [...tricks].sort((a, b) => a.name.localeCompare(b.name));

    const q = deferredSearchTerm.toLowerCase().trim();
    if (!q) return sorted;

    return sorted.filter(
      (trick) =>
        trick.name.toLowerCase().includes(q) ||
        (trick.alternateNames ?? []).some((name) =>
          name.toLowerCase().includes(q),
        ),
    );
  }, [tricks, deferredSearchTerm]);

  return (
    <div className="hidden w-72 shrink-0 flex-col border-r md:flex">
      <Command shouldFilter={false} className="bg-background">
        <CommandInput
          onValueChange={setSearchTerm}
          placeholder="search tricks..."
          value={searchTerm}
        />
        <CommandList className="max-h-full">
          <CommandEmpty>No tricks found.</CommandEmpty>
          <CommandGroup>
            {sortedTricks.map((trick) => (
              <CommandItem
                key={trick.id}
                onSelect={() => onSelect(trick)}
                value={trick.id}
                className={cn(trick.id === selectedId && "bg-accent")}
              >
                <span className="truncate font-medium">
                  {trick.name.toLowerCase()}
                </span>
                {trick.isCompound && (
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 text-[10px]"
                  >
                    compound
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
