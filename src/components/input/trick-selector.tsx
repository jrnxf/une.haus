import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { tricks } from "~/lib/tricks";
import { cn } from "~/lib/utils";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

type TrickOption = {
  id: number;
  slug: string;
  name: string;
};

export function TrickSelector({
  value,
  onChange,
  excludeIds = [],
  placeholder = "Select tricks...",
  emptyText = "No tricks found",
}: {
  value: TrickOption[];
  onChange: (tricks: TrickOption[]) => void;
  excludeIds?: number[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: allTricks = [] } = useQuery(
    tricks.search.queryOptions({ excludeIds, limit: 50 }),
  );

  const availableTricks = useMemo(
    () =>
      allTricks.filter(
        (trick) =>
          !excludeIds.includes(trick.id) &&
          !value.some((v) => v.id === trick.id),
      ),
    [allTricks, excludeIds, value],
  );

  const searchReadyTricks = useMemo(
    () =>
      availableTricks.map((trick) => ({
        ...trick,
        searchKey: `${trick.name.toLowerCase()} ${trick.slug.toLowerCase()}`,
      })),
    [availableTricks],
  );

  const fzf = useFzf([searchReadyTricks, { selector: (t) => t.searchKey }]);
  const filteredTricks = query ? fzf.find(query.toLowerCase()) : searchReadyTricks.map((item) => ({ item }));

  const handleSelect = (trick: TrickOption) => {
    const isSelected = value.some((v) => v.id === trick.id);
    if (isSelected) {
      onChange(value.filter((v) => v.id !== trick.id));
    } else {
      onChange([...value, trick]);
    }
  };

  const handleRemove = (trickId: number) => {
    onChange(value.filter((v) => v.id !== trickId));
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            size="lg"
          >
            {placeholder}
            <div className="flex items-center gap-2">
              {value.length > 0 && (
                <Badge variant="secondary">{value.length}</Badge>
              )}
              <ChevronsUpDown className="size-4 opacity-50" />
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent
          className="w-full p-0"
          showCloseButton={false}
          onCloseAutoFocus={() => setQuery("")}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search tricks..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {filteredTricks.map(({ item: trick }) => {
                  const isSelected = value.some((v) => v.id === trick.id);
                  return (
                    <CommandItem
                      key={trick.id}
                      value={trick.id.toString()}
                      onSelect={() => handleSelect(trick)}
                    >
                      <span className="truncate">{trick.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {trick.slug}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((trick) => (
            <Badge key={trick.id} variant="secondary" className="gap-1 pr-1">
              {trick.name}
              <button
                type="button"
                onClick={() => handleRemove(trick.id)}
                className="hover:bg-muted rounded-sm p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Variant for selecting tricks with relationship types
type TrickRelationship = {
  targetTrickId: number;
  targetTrickSlug: string;
  targetTrickName: string;
  type: "prerequisite" | "optional_prerequisite" | "related";
};

export function TrickRelationshipSelector({
  value,
  onChange,
  excludeIds = [],
  relationshipType,
  placeholder,
}: {
  value: TrickRelationship[];
  onChange: (relationships: TrickRelationship[]) => void;
  excludeIds?: number[];
  relationshipType: "prerequisite" | "optional_prerequisite" | "related";
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: allTricks = [] } = useQuery(
    tricks.search.queryOptions({ excludeIds, limit: 50 }),
  );

  const selectedIds = value.map((v) => v.targetTrickId);

  const availableTricks = useMemo(
    () =>
      allTricks.filter(
        (trick) =>
          !excludeIds.includes(trick.id) && !selectedIds.includes(trick.id),
      ),
    [allTricks, excludeIds, selectedIds],
  );

  const searchReadyTricks = useMemo(
    () =>
      availableTricks.map((trick) => ({
        ...trick,
        searchKey: `${trick.name.toLowerCase()} ${trick.slug.toLowerCase()}`,
      })),
    [availableTricks],
  );

  const fzf = useFzf([searchReadyTricks, { selector: (t) => t.searchKey }]);
  const filteredTricks = query ? fzf.find(query.toLowerCase()) : searchReadyTricks.map((item) => ({ item }));

  const handleSelect = (trick: TrickOption) => {
    const isSelected = selectedIds.includes(trick.id);
    if (isSelected) {
      onChange(value.filter((v) => v.targetTrickId !== trick.id));
    } else {
      onChange([
        ...value,
        {
          targetTrickId: trick.id,
          targetTrickSlug: trick.slug,
          targetTrickName: trick.name,
          type: relationshipType,
        },
      ]);
    }
  };

  const handleRemove = (trickId: number) => {
    onChange(value.filter((v) => v.targetTrickId !== trickId));
  };

  const typeLabels = {
    prerequisite: "Prerequisites",
    optional_prerequisite: "Optional Prerequisites",
    related: "Related Tricks",
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            size="lg"
          >
            {placeholder ?? `Select ${typeLabels[relationshipType].toLowerCase()}...`}
            <div className="flex items-center gap-2">
              {value.length > 0 && (
                <Badge variant="secondary">{value.length}</Badge>
              )}
              <ChevronsUpDown className="size-4 opacity-50" />
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent
          className="w-full p-0"
          showCloseButton={false}
          onCloseAutoFocus={() => setQuery("")}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search tricks..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No tricks found</CommandEmpty>
              <CommandGroup>
                {filteredTricks.map(({ item: trick }) => {
                  const isSelected = selectedIds.includes(trick.id);
                  return (
                    <CommandItem
                      key={trick.id}
                      value={trick.id.toString()}
                      onSelect={() => handleSelect(trick)}
                    >
                      <span className="truncate">{trick.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {trick.slug}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((rel) => (
            <Badge
              key={rel.targetTrickId}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {rel.targetTrickName}
              <button
                type="button"
                onClick={() => handleRemove(rel.targetTrickId)}
                className="hover:bg-muted rounded-sm p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
