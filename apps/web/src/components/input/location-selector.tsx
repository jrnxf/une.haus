import { useMutation } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useDebounceCallback } from "usehooks-ts"

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import { useFormField } from "~/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Separator } from "~/components/ui/separator"
import { type SelectLocation } from "~/db/schema"
import { location } from "~/lib/location"
import { cn } from "~/lib/utils"

type LocationSelectorLocation = Omit<SelectLocation, "userId">

type SelectOption = { label: string; value: string }

export function LocationSelector({
  onUpdate,
  placeholder = "",
}: {
  onUpdate: (location: LocationSelectorLocation | undefined) => void
  placeholder?: string
}) {
  const { formItemId } = useFormField()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SelectOption>()
  const [options, setOptions] = useState<SelectOption[]>([])
  const [noResults, setNoResults] = useState(false)

  const { isPending: isFetchingCities, mutate: fetchCities } = useMutation({
    mutationFn: location.searchCities.fn,
  })

  const { mutate: fetchPlace } = useMutation({
    mutationFn: location.place.fn,
  })

  const exchangeForPlaceId = useCallback(
    async ({ placeId, placeName }: { placeId: string; placeName: string }) => {
      fetchPlace({ data: { placeId, placeName } }, { onSuccess: onUpdate })
    },
    [fetchPlace, onUpdate],
  )

  const debouncedSearch = useDebounceCallback(
    useCallback(
      async (query: string) => {
        fetchCities(
          { data: { query } },
          {
            onError: (error) => {
              toast.error(error.message)
              setNoResults(true)
              setOptions([])
            },
            onSuccess(data) {
              if (data.length === 0) {
                setNoResults(true)
                setOptions([])
                return
              }

              setOptions(
                data.map((place) => ({
                  label: place.description,
                  value: place.placeId,
                })),
              )
            },
          },
        )
      },
      [fetchCities],
    ),
  )

  const displayedValue = selected?.label ?? placeholder

  const fetching = isFetchingCities
  return (
    <div>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          id={formItemId}
          aria-expanded={open}
          className="border-input ring-offset-background focus-visible:ring-ring dark:bg-input/30 flex h-9 w-full items-center justify-between overflow-hidden rounded-md border bg-transparent px-3 py-1 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
          role="combobox"
        >
          <span className="truncate">{displayedValue}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-xs p-0">
          <Command shouldFilter={false}>
            <CommandInput
              className="w-xs"
              containerClassName={
                !noResults && options.length === 0 ? "border-b-0" : undefined
              }
              isFetching={fetching}
              onValueChange={(nextQuery) => {
                if (!nextQuery) {
                  setNoResults(false)
                  setOptions([])
                  return
                }
                setNoResults(false) // prove me wrong
                debouncedSearch(nextQuery)
              }}
              placeholder="search..."
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
                            setSelected(undefined)
                            onUpdate(undefined)
                          } else {
                            const match = options.find(
                              (option) => option.value === value,
                            )
                            if (match) {
                              exchangeForPlaceId({
                                placeId: match.value,
                                placeName: option.label,
                              })
                              setSelected(match)
                            }
                          }
                          setOpen(false)
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
  )
}
