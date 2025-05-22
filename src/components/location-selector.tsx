import { Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";

import type { SelectLocation } from "~/db/schema";

import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/integrations/trpc/react";
import { useMutation } from "@tanstack/react-query";

export type LocationSelectorLocation = Omit<SelectLocation, "userId">;

type SelectOption = { label: string; value: string };

export function LocationSelector({
  id,
  onUpdate,
  placeholder = "Select location...",
}: {
  id: string;
  onUpdate: (location: LocationSelectorLocation | undefined) => void;
  placeholder?: string;
}) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectOption>();
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [noResults, setNoResults] = useState(false);

  const { isPending: isFetchingCities, mutate: fetchCities } = useMutation(
    trpc.location.cities.mutationOptions(),
  );

  const { mutate: fetchPlace } = useMutation(
    trpc.location.place.mutationOptions(),
  );

  const exchangeForPlaceId = useCallback(
    async (placeId: string) => {
      fetchPlace({ placeId }, { onSuccess: onUpdate });
    },
    [fetchPlace, onUpdate],
  );

  const debouncedSearch = useDebounceCallback(
    useCallback(
      async (query: string) => {
        fetchCities(
          { query },
          {
            onError: (error) => {
              toast.error(error.message);
              setNoResults(true);
              setOptions([]);
            },
            onSuccess(data) {
              if (data.length === 0) {
                setNoResults(true);
                setOptions([]);
                return;
              }

              setOptions(
                data.map((place) => ({
                  label: place.description,
                  value: place.placeId,
                })),
              );
            },
          },
        );
      },
      [fetchCities],
    ),
  );

  const displayedValue = selected?.label ?? placeholder;

  const fetching = isFetchingCities;
  return (
    <div>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className="w-full justify-between hover:bg-inherit"
            id={id}
            role="combobox"
            size="lg"
            variant="outline"
          >
            {displayedValue}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-xs p-0">
          <Command async fetchInProgress={fetching} shouldFilter={false}>
            <CommandInput
              autoFocus
              className="w-xs"
              isFetching={fetching}
              onValueChange={(nextQuery) => {
                if (!nextQuery) {
                  setNoResults(false);
                  setOptions([]);
                  return;
                }
                setNoResults(false); // prove me wrong
                debouncedSearch(nextQuery);
              }}
              placeholder="Search for a city"
            />
            {noResults && (
              <p className="border-t py-6 text-center text-sm">
                No city found.
              </p>
            )}

            {options.length > 0 && (
              <>
                <Separator />

                <CommandGroup>
                  <CommandList>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={(value) => {
                          if (value === selected?.value) {
                            // deselect
                            setSelected(undefined);
                            onUpdate(undefined);
                          } else {
                            const match = options.find(
                              (option) => option.value === value,
                            );
                            if (match) {
                              exchangeForPlaceId(match.value);
                              setSelected(match);
                            }
                          }
                          setOpen(false);
                        }}
                        value={option.value}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            selected?.value === option.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandList>
                </CommandGroup>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
