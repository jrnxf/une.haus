import { useSuspenseQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useMemo } from "react"

import { VirtualizedCommandCombobox } from "~/components/input/virtualized-command-combobox"
import { Badge } from "~/components/ui/badge"
import { tricks } from "~/lib/tricks"
import { type ElementFormValue } from "~/lib/tricks/schemas"

const EMPTY_IDS: number[] = []

type TrickOption = {
  id: number
  name: string
}

// Variant for selecting tricks with relationship types
type TrickRelationship = {
  targetTrickId: number
  targetTrickName: string
  type: "prerequisite" | "related"
}

export function TrickRelationshipSelector({
  value,
  onChange,
  excludeIds = EMPTY_IDS,
  relationshipType,
}: {
  value: TrickRelationship[]
  onChange: (relationships: TrickRelationship[]) => void
  excludeIds?: number[]
  relationshipType: "prerequisite" | "related"
}) {
  const { data: allTricks } = useSuspenseQuery(
    tricks.search.queryOptions({ excludeIds }),
  )

  const selectedIds = useMemo(
    () => new Set(value.map((v) => v.targetTrickId)),
    [value],
  )

  const excludedIds = useMemo(() => new Set(excludeIds), [excludeIds])

  const availableTricks = useMemo(
    () =>
      allTricks.filter(
        (trick) => !excludedIds.has(trick.id) && !selectedIds.has(trick.id),
      ),
    [allTricks, excludedIds, selectedIds],
  )

  const handleSelect = (trick: TrickOption) => {
    if (selectedIds.has(trick.id)) {
      onChange(value.filter((v) => v.targetTrickId !== trick.id))
    } else {
      onChange([
        ...value,
        {
          targetTrickId: trick.id,
          targetTrickName: trick.name,
          type: relationshipType,
        },
      ])
    }
  }

  const handleRemove = (trickId: number) => {
    onChange(value.filter((v) => v.targetTrickId !== trickId))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <VirtualizedCommandCombobox
        items={availableTricks}
        selectedIds={selectedIds}
        title="select tricks"
        triggerLabel="add"
        searchPlaceholder="search tricks..."
        emptyText="no tricks found"
        clearQueryOnSelect
        onSelect={handleSelect}
      />

      {value.map((rel) => (
        <Badge
          key={rel.targetTrickId}
          variant="secondary"
          className="gap-1 pr-1"
        >
          {rel.targetTrickName}
          <button
            type="button"
            aria-label={`remove ${rel.targetTrickName}`}
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
  const { data: allElements = [] } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  )

  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value])

  const availableElements = useMemo(
    () => allElements.filter((element) => !selectedIds.has(element.id)),
    [allElements, selectedIds],
  )

  const handleSelect = (element: TrickOption) => {
    if (selectedIds.has(element.id)) {
      onChange(value.filter((v) => v.id !== element.id))
    } else {
      onChange([
        ...value,
        {
          id: element.id,
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
      <VirtualizedCommandCombobox
        items={availableElements}
        selectedIds={selectedIds}
        title="select elements"
        triggerLabel="add"
        searchPlaceholder="search elements..."
        emptyText="no elements found"
        onSelect={handleSelect}
      />

      {value.map((element) => (
        <Badge key={element.id} variant="secondary" className="gap-1 pr-1">
          {element.name}
          <button
            type="button"
            aria-label={`remove ${element.name}`}
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
