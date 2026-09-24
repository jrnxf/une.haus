import { useVirtualizer } from "@tanstack/react-virtual"
import { Check } from "lucide-react"
import { useMemo, useState } from "react"

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
import { cn } from "~/lib/utils"
import { useFzf } from "~/lib/ux/hooks/use-fzf"

export function VirtualizedCommandCombobox({
  items,
  selectedIds,
  title,
  triggerLabel,
  searchPlaceholder,
  emptyText,
  clearQueryOnSelect = false,
  onSelect,
}: {
  items: { id: number; name: string }[]
  selectedIds: ReadonlySet<number>
  title: string
  triggerLabel: string
  searchPlaceholder: string
  emptyText: string
  clearQueryOnSelect?: boolean
  onSelect: (item: { id: number; name: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null)

  const searchReadyItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        searchKey: item.name.toLowerCase(),
      })),
    [items],
  )

  const fzf = useFzf([searchReadyItems, { selector: (i) => i.searchKey }])
  const filteredItems = query
    ? fzf.find(query.toLowerCase())
    : searchReadyItems.map((item) => ({ item }))

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => listElement,
    estimateSize: () => 36,
    overscan: 5,
  })

  const handleSelect = (item: { id: number; name: string }) => {
    onSelect(item)
    if (clearQueryOnSelect) setQuery("")
  }

  return (
    <ResponsiveCombobox
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery("")
      }}
      title={title}
      trigger={
        <Button
          variant="secondary"
          className="h-auto rounded-full py-0.5 text-xs"
        >
          {triggerLabel}
        </Button>
      }
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={searchPlaceholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList ref={setListElement}>
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const { item } = filteredItems[virtualItem.index]
                const isSelected = selectedIds.has(item.id)
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id.toString()}
                    onSelect={() => handleSelect(item)}
                    style={{
                      position: "absolute",
                      top: virtualItem.start,
                      left: 0,
                      right: 0,
                      height: `${virtualItem.size}px`,
                    }}
                  >
                    <span className="truncate">{item.name}</span>
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
  )
}
