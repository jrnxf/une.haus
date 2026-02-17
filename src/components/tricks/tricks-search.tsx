import { SearchIcon } from "lucide-react";
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
import { ResponsiveCombobox } from "~/components/ui/responsive-combobox";
import type { Trick, TricksData } from "~/lib/tricks";
import { cn } from "~/lib/utils";

type TricksSearchProps = {
  data: TricksData;
  onSelectTrick: (trick: Trick) => void;
};

export function TricksSearch({ data, onSelectTrick }: TricksSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Filter tricks by search term
  const filteredTricks = useMemo(() => {
    const searchLower = deferredSearchTerm.toLowerCase().trim();
    const nonPrefix = data.tricks.filter((t) => !t.isPrefix);
    if (!searchLower) return nonPrefix.slice(0, 20);

    return nonPrefix
      .filter(
        (trick) =>
          trick.name.toLowerCase().includes(searchLower) ||
          trick.alternateNames.some((name) =>
            name.toLowerCase().includes(searchLower),
          ),
      )
      .slice(0, 50);
  }, [data.tricks, deferredSearchTerm]);

  function handleSelect(trickId: string) {
    const trick = data.byId[trickId];
    if (trick) {
      onSelectTrick(trick);
      setOpen(false);
      setSearchTerm("");
    }
  }

  return (
    <ResponsiveCombobox
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchTerm("");
      }}
      title="search tricks"
      trigger={
        <button
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border px-3",
            "bg-background text-muted-foreground text-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "transition-colors",
          )}
          type="button"
        >
          <SearchIcon className="size-4 shrink-0" />
          <span>search tricks...</span>
        </button>
      }
    >
      <Command shouldFilter={false}>
        <CommandInput
          onValueChange={setSearchTerm}
          placeholder="search tricks..."
          value={searchTerm}
        />
        <CommandList>
          <CommandEmpty>No tricks found.</CommandEmpty>
          <CommandGroup>
            {filteredTricks.map((trick) => (
              <CommandItem
                key={trick.id}
                onSelect={() => handleSelect(trick.id)}
                value={trick.id}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-medium">{trick.name}</span>
                  {trick.alternateNames.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      aka {trick.alternateNames.join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {trick.elements.slice(0, 2).map((elem) => (
                    <Badge
                      className="px-1.5 py-0 text-[10px]"
                      key={elem}
                      variant="secondary"
                    >
                      {elem}
                    </Badge>
                  ))}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </ResponsiveCombobox>
  );
}
