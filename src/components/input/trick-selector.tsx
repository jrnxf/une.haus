import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Check, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import { ResponsiveCombobox } from "~/components/ui/responsive-combobox"
import { tricks } from "~/lib/tricks"
import { type ElementFormValue } from "~/lib/tricks/schemas"
import { cn } from "~/lib/utils"
import { useFzf } from "~/lib/ux/hooks/use-fzf"

type TrickOption = {
  id: number
  slug: string
  name: string
}

// Variant for selecting tricks with relationship types
type TrickRelationship = {
  targetTrickId: number
  targetTrickSlug: string
  targetTrickName: string
  type: "prerequisite" | "related"
}

export function TrickRelationshipSelector({
  value,
  onChange,
  excludeIds = [],
  relationshipType,
}: {
  value: TrickRelationship[]
  onChange: (relationships: TrickRelationship[]) => void
  excludeIds?: number[]
  relationshipType: "prerequisite" | "related"
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null)

  const { data: allTricks = [] } = useQuery(
    tricks.search.queryOptions({ excludeIds }),
  )

  const selectedIds = value.map((v) => v.targetTrickId)

  const availableTricks = useMemo(
    () =>
      allTricks.filter(
        (trick) =>
          !excludeIds.includes(trick.id) && !selectedIds.includes(trick.id),
      ),
    [allTricks, excludeIds, selectedIds],
  )

  const searchReadyTricks = useMemo(
    () =>
      availableTricks.map((trick) => ({
        ...trick,
        searchKey: `${trick.name.toLowerCase()} ${trick.slug.toLowerCase()}`,
      })),
    [availableTricks],
  )

  const fzf = useFzf([searchReadyTricks, { selector: (t) => t.searchKey }])
  const filteredTricks = query
    ? fzf.find(query.toLowerCase())
    : searchReadyTricks.map((item) => ({ item }))

  const virtualizer = useVirtualizer({
    count: filteredTricks.length,
    getScrollElement: () => listElement,
    estimateSize: () => 36,
    overscan: 5,
  })

  const handleSelect = (trick: TrickOption) => {
    const isSelected = selectedIds.includes(trick.id)
    if (isSelected) {
      onChange(value.filter((v) => v.targetTrickId !== trick.id))
    } else {
      onChange([
        ...value,
        {
          targetTrickId: trick.id,
          targetTrickSlug: trick.slug,
          targetTrickName: trick.name,
          type: relationshipType,
        },
      ])
    }
    setQuery("")
  }

  const handleRemove = (trickId: number) => {
    onChange(value.filter((v) => v.targetTrickId !== trickId))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ResponsiveCombobox
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setQuery("")
        }}
        title="select tricks"
        trigger={
          <Button
            variant="secondary"
            className="h-auto rounded-full py-0.5 text-xs"
          >
            add
          </Button>
        }
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="search tricks..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList ref={setListElement}>
            <CommandEmpty>no tricks found</CommandEmpty>
            <CommandGroup>
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const { item: trick } = filteredTricks[virtualItem.index]
                  const isSelected = selectedIds.includes(trick.id)
                  return (
                    <CommandItem
                      key={trick.id}
                      value={trick.id.toString()}
                      onSelect={() => handleSelect(trick)}
                      style={{
                        position: "absolute",
                        top: virtualItem.start,
                        left: 0,
                        right: 0,
                        height: `${virtualItem.size}px`,
                      }}
                    >
                      <span className="truncate">{trick.name}</span>
                      <Check
                        className={cn(
                          "ml-auto size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </ResponsiveCombobox>

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
  )
}

// Element selector for picking elements that apply to a trick
export function ElementSelector({
  value,
  onChange,
}: {
  value: ElementFormValue[]
  onChange: (elements: ElementFormValue[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null)

  const { data: allElements = [] } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  )

  const selectedIds = value.map((v) => v.id)

  const availableElements = useMemo(
    () => allElements.filter((element) => !selectedIds.includes(element.id)),
    [allElements, selectedIds],
  )

  const searchReadyElements = useMemo(
    () =>
      availableElements.map((element) => ({
        ...element,
        searchKey: `${element.name.toLowerCase()} ${element.slug.toLowerCase()}`,
      })),
    [availableElements],
  )

  const fzf = useFzf([searchReadyElements, { selector: (e) => e.searchKey }])
  const filteredElements = query
    ? fzf.find(query.toLowerCase())
    : searchReadyElements.map((item) => ({ item }))

  const virtualizer = useVirtualizer({
    count: filteredElements.length,
    getScrollElement: () => listElement,
    estimateSize: () => 36,
    overscan: 5,
  })

  const handleSelect = (element: {
    id: number
    slug: string
    name: string
  }) => {
    const isSelected = selectedIds.includes(element.id)
    if (isSelected) {
      onChange(value.filter((v) => v.id !== element.id))
    } else {
      onChange([
        ...value,
        {
          id: element.id,
          slug: element.slug,
          name: element.name,
        },
      ])
    }
  }

  const handleRemove = (elementId: number) => {
    onChange(value.filter((v) => v.id !== elementId))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ResponsiveCombobox
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setQuery("")
        }}
        title="select elements"
        trigger={
          <Button
            variant="secondary"
            className="h-auto rounded-full py-0.5 text-xs"
          >
            add
          </Button>
        }
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="search elements..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList ref={setListElement}>
            <CommandEmpty>no elements found</CommandEmpty>
            <CommandGroup>
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const { item: element } = filteredElements[virtualItem.index]
                  const isSelected = selectedIds.includes(element.id)
                  return (
                    <CommandItem
                      key={element.id}
                      value={element.id.toString()}
                      onSelect={() => handleSelect(element)}
                      style={{
                        position: "absolute",
                        top: virtualItem.start,
                        left: 0,
                        right: 0,
                        height: `${virtualItem.size}px`,
                      }}
                    >
                      <span className="truncate">{element.name}</span>
                      <Check
                        className={cn(
                          "ml-auto size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </ResponsiveCombobox>

      {value.map((element) => (
        <Badge key={element.id} variant="secondary" className="gap-1 pr-1">
          {element.name}
          <button
            type="button"
            onClick={() => handleRemove(element.id)}
            className="hover:bg-muted rounded-sm p-0.5"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
