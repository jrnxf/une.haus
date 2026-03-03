import { flip, offset, shift, useFloating } from "@floating-ui/react"
import { CheckIcon, ChevronRightIcon, FilterIcon, XIcon } from "lucide-react"
import { createContext, useCallback, useContext, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "~/components/ui/button-group"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { cn } from "~/lib/utils"

// --- Types ---

type FilterOption = {
  value: string
  label: string
  children?: FilterOption[]
}

type FilterOperator = {
  value: string
  label: string
}

type FilterField = {
  key: string
  label: string
  type?: "select" | "multiselect" | "text"
  options?: FilterOption[]
  operators?: FilterOperator[]
  defaultOperator?: string
  placeholder?: string
}

type ActiveFilter = {
  id: string
  field: string
  operator: string
  values: string[]
}

// --- Helpers ---

const createFilter = (
  field: string,
  operator?: string,
  values: string[] = [],
): ActiveFilter => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  field,
  operator: operator || "is",
  values,
})

const DEFAULT_OPERATORS: Record<string, FilterOperator[]> = {
  select: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  multiselect: [
    { value: "is_any_of", label: "includes" },
    { value: "includes_all", label: "is exactly" },
  ],
  text: [
    { value: "contains", label: "contains" },
    { value: "is", label: "is exactly" },
  ],
}

function countSelected(options: FilterOption[], values: string[]): number {
  return options.reduce((n, opt) => {
    if (opt.children) return n + countSelected(opt.children, values)
    return n + (values.includes(opt.value) ? 1 : 0)
  }, 0)
}

function toggleFilterValue(
  filters: ActiveFilter[],
  fieldKey: string,
  value: string,
): ActiveFilter[] {
  const existing = filters.find((f) => f.field === fieldKey)
  if (!existing) {
    return [
      ...filters,
      { id: "", field: fieldKey, operator: "", values: [value] },
    ]
  }
  const has = existing.values.includes(value)
  const nextValues = has
    ? existing.values.filter((v) => v !== value)
    : [...existing.values, value]
  if (nextValues.length === 0) {
    return filters.filter((f) => f.field !== fieldKey)
  }
  return filters.map((f) =>
    f.field === fieldKey ? { ...f, values: nextValues } : f,
  )
}

// --- Context ---

const compactItems = cn(
  "[&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-1.5 [&_[data-slot=command-item]]:text-sm",
  "[&_[data-slot=command-input-wrapper]]:h-8 [&_[data-slot=command-input-wrapper]]:min-h-8 [&_[data-slot=command-input]]:text-sm",
)

type FilterSizeContextValue = {
  size: "sm" | "default"
}

const FilterSizeContext = createContext<FilterSizeContextValue>({
  size: "default",
})

// --- Sub-panel positioned via Floating UI ---

function SubPanel({
  anchorEl,
  onClose,
  children,
}: {
  anchorEl: HTMLElement | null
  onClose: () => void
  children: React.ReactNode
}) {
  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    placement: "right-start",
    middleware: [offset(2), flip(), shift({ padding: 8 })],
    elements: { reference: anchorEl },
  })

  if (!anchorEl) return null

  return createPortal(
    <div
      ref={refs.setFloating}
      data-slot="filter-panel"
      className="bg-popover text-popover-foreground border-border z-50 w-[200px] rounded-md border shadow-md"
      style={floatingStyles}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

// --- Recursive options menu (handles branches + leaves at any depth) ---

function OptionsMenu({
  options,
  values,
  onToggle,
  onClose,
  onSelectSingle,
}: {
  options: FilterOption[]
  values: string[]
  onToggle: (value: string) => void
  onClose: () => void
  onSelectSingle?: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState("")
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const highlightedOption = options.find(
    (o) => o.label.toLowerCase() === highlighted.toLowerCase(),
  )

  const closeSub = useCallback(() => {
    setOpenSub(null)
    inputRef.current?.focus()
  }, [])

  const openSubOption = openSub
    ? options.find((o) => o.value === openSub)
    : null
  const anchorEl = openSub ? (itemRefs.current[openSub] ?? null) : null

  // Separate branch items (children) from leaf items, then split leaves into selected/unselected
  const branchItems = options.filter((o) => o.children)
  const selectedLeaves = options.filter(
    (o) => !o.children && values.includes(o.value),
  )
  const unselectedLeaves = options.filter(
    (o) => !o.children && !values.includes(o.value),
  )

  const handleToggle = useCallback(
    (value: string) => {
      if (onSelectSingle) {
        onSelectSingle(value)
        return
      }
      const isSelected = values.includes(value)
      if (isSelected) {
        const idx = selectedLeaves.findIndex((o) => o.value === value)
        const remaining = selectedLeaves.filter((o) => o.value !== value)
        const next =
          remaining[Math.min(idx, remaining.length - 1)] ?? unselectedLeaves[0]
        if (next) setHighlighted(next.value)
      } else {
        const idx = unselectedLeaves.findIndex((o) => o.value === value)
        const remaining = unselectedLeaves.filter((o) => o.value !== value)
        const next =
          remaining[Math.min(idx, remaining.length - 1)] ?? selectedLeaves[0]
        if (next) setHighlighted(next.value)
      }
      onToggle(value)
      setSearch("")
    },
    [selectedLeaves, unselectedLeaves, values, onToggle, onSelectSingle],
  )

  return (
    <>
      <Command
        className={cn("bg-popover dark:bg-popover", compactItems)}
        value={highlighted}
        onValueChange={setHighlighted}
      >
        <CommandInput
          ref={inputRef}
          placeholder="search..."
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && highlightedOption?.children) {
              e.preventDefault()
              setOpenSub(highlightedOption.value)
            } else if (e.key === "ArrowLeft") {
              if (openSub) {
                e.preventDefault()
                closeSub()
              } else if (
                inputRef.current?.selectionStart === 0 &&
                inputRef.current?.selectionEnd === 0
              ) {
                e.preventDefault()
                onClose()
              }
            } else if (e.key === "Escape") {
              e.preventDefault()
              e.stopPropagation()
              if (openSub) closeSub()
              else onClose()
            }
          }}
        />
        <CommandList className="max-h-[min(var(--available-height,24rem),24rem)]">
          <CommandEmpty>no results</CommandEmpty>

          {branchItems.length > 0 && (
            <CommandGroup>
              {branchItems.map((option) => {
                const count = countSelected(option.children!, values)
                return (
                  <div
                    key={option.value}
                    ref={(el) => {
                      itemRefs.current[option.value] = el
                    }}
                  >
                    <CommandItem
                      value={option.label}
                      onSelect={() =>
                        setOpenSub(
                          openSub === option.value ? null : option.value,
                        )
                      }
                    >
                      <span className="flex-1">{option.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="px-1 text-xs">
                          {count}
                        </Badge>
                      )}
                      <ChevronRightIcon className="text-muted-foreground size-3.5" />
                    </CommandItem>
                  </div>
                )
              })}
            </CommandGroup>
          )}

          {selectedLeaves.length > 0 && (
            <CommandGroup>
              {selectedLeaves.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleToggle(option.value)}
                >
                  <CheckIcon className="text-primary size-4" />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {selectedLeaves.length > 0 && unselectedLeaves.length > 0 && (
            <CommandSeparator />
          )}

          {unselectedLeaves.length > 0 && (
            <CommandGroup>
              {unselectedLeaves.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleToggle(option.value)}
                >
                  <CheckIcon className="size-4 opacity-0" />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>

      {openSub && openSubOption?.children && (
        <SubPanel anchorEl={anchorEl} onClose={closeSub}>
          <OptionsMenu
            options={openSubOption.children}
            values={values}
            onToggle={onToggle}
            onSelectSingle={onSelectSingle}
            onClose={closeSub}
          />
        </SubPanel>
      )}
    </>
  )
}

// --- Chip sub-components ---

function FilterOperatorDropdown({
  field,
  operator,
  onChange,
}: {
  field: FilterField
  operator: string
  onChange: (operator: string) => void
}) {
  const { size } = useContext(FilterSizeContext)
  const operators =
    field.operators || DEFAULT_OPERATORS[field.type || "select"] || []
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    operator.replaceAll("_", " ")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={size}
            className="text-muted-foreground hover:text-foreground"
          >
            {operatorLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className="flex items-center justify-between"
          >
            <span>{op.label}</span>
            <CheckIcon
              className={cn(
                "text-primary ml-4 size-4",
                op.value === operator ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterValuePopover({
  field,
  values,
  onToggle,
  onSelectSingle,
}: {
  field: FilterField
  values: string[]
  onToggle: (value: string) => void
  onSelectSingle?: (value: string) => void
}) {
  const { size } = useContext(FilterSizeContext)
  const [open, setOpen] = useState(false)

  const options = field.options ?? []
  const selectedOptions = options.filter((opt) => values.includes(opt.value))
  const displayLabel =
    selectedOptions.length === 1
      ? selectedOptions[0].label
      : selectedOptions.length > 0
        ? `${selectedOptions.length} selected`
        : "select..."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size}>
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] gap-0 p-0" align="start">
        <OptionsMenu
          options={options}
          values={values}
          onToggle={onToggle}
          onSelectSingle={
            field.type === "select"
              ? (value) => {
                  onSelectSingle?.(value)
                  setOpen(false)
                }
              : undefined
          }
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function FilterChip({
  field,
  active,
  onUpdateOperator,
  onToggleValue,
  onSetValues,
  onRemove,
}: {
  field: FilterField
  active: ActiveFilter
  onUpdateOperator: (operator: string) => void
  onToggleValue: (value: string) => void
  onSetValues: (values: string[]) => void
  onRemove: () => void
}) {
  const { size } = useContext(FilterSizeContext)

  return (
    <ButtonGroup>
      <ButtonGroupText className="border-border bg-background dark:border-input dark:bg-input/30 bg-clip-padding">
        {field.label}
      </ButtonGroupText>
      <FilterOperatorDropdown
        field={field}
        operator={active.operator}
        onChange={onUpdateOperator}
      />
      {field.type === "text" ? (
        <input
          autoFocus
          value={active.values[0] || ""}
          onChange={(e) => onSetValues([e.target.value])}
          placeholder={field.placeholder}
          className={cn(
            "border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 w-36 rounded-md border bg-clip-padding px-3 text-base shadow-xs outline-none focus-visible:ring-3",
            size === "sm" ? "h-8" : "h-9",
          )}
        />
      ) : (
        <FilterValuePopover
          field={field}
          values={active.values}
          onToggle={onToggleValue}
          onSelectSingle={
            field.type === "select"
              ? (value) => onSetValues([value])
              : undefined
          }
        />
      )}
      <Button
        aria-label="remove filter"
        variant="outline"
        size={size === "sm" ? "icon-sm" : "icon"}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </ButtonGroup>
  )
}

// --- Add-filter popover (field picker with sub-menus) ---

function FiltersTrigger({
  fields,
  filters,
  onSelectField,
  onToggleValue,
  size,
}: {
  fields: FilterField[]
  filters: ActiveFilter[]
  onSelectField?: (fieldKey: string) => void
  onToggleValue?: (fieldKey: string, value: string) => void
  size?: "sm" | "default"
}) {
  const [open, setOpen] = useState(false)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState("")
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const closeSub = useCallback(() => {
    setOpenSub(null)
  }, [])

  const openSubField = openSub ? fields.find((f) => f.key === openSub) : null
  const openSubValues = filters.find((f) => f.field === openSub)?.values ?? []
  const anchorEl = openSub ? (itemRefs.current[openSub] ?? null) : null

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setOpenSub(null)
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size={size ?? "sm"}>
          <FilterIcon className="size-3.5" />
          filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] gap-0 p-0" align="start">
        <Command
          className={cn("bg-popover dark:bg-popover", compactItems)}
          value={highlighted}
          onValueChange={setHighlighted}
        >
          <CommandList>
            <CommandEmpty>no fields</CommandEmpty>
            <CommandGroup>
              {fields.map((field) => {
                const hasOptions = (field.options?.length ?? 0) > 0
                const active = filters.find((f) => f.field === field.key)
                const values = active?.values ?? []
                const count = hasOptions
                  ? countSelected(field.options!, values)
                  : 0

                return (
                  <div
                    key={field.key}
                    ref={(el) => {
                      itemRefs.current[field.key] = el
                    }}
                  >
                    <CommandItem
                      value={field.label}
                      onSelect={() => {
                        if (hasOptions) {
                          setOpenSub(openSub === field.key ? null : field.key)
                        } else {
                          onSelectField?.(field.key)
                          setOpen(false)
                        }
                      }}
                    >
                      <span className="flex-1">{field.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="px-1 text-xs">
                          {count}
                        </Badge>
                      )}
                      {hasOptions && (
                        <ChevronRightIcon className="text-muted-foreground size-3.5" />
                      )}
                    </CommandItem>
                  </div>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {openSub && openSubField && openSubField.options && (
          <SubPanel anchorEl={anchorEl} onClose={closeSub}>
            <OptionsMenu
              options={openSubField.options}
              values={openSubValues}
              onToggle={(value) => onToggleValue?.(openSub, value)}
              onClose={closeSub}
            />
          </SubPanel>
        )}
      </PopoverContent>
    </Popover>
  )
}

// --- Main component ---

function Filters({
  fields,
  filters,
  onFiltersChange,
  size = "default",
  className,
}: {
  fields: FilterField[]
  filters: ActiveFilter[]
  onFiltersChange: (filters: ActiveFilter[]) => void
  size?: "sm" | "default"
  className?: string
}) {
  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fields.find((f) => f.key === fieldKey)
      if (!field) return
      const defaultOp =
        field.defaultOperator ||
        DEFAULT_OPERATORS[field.type || "select"]?.[0]?.value ||
        "is"
      const newFilter = createFilter(fieldKey, defaultOp)
      onFiltersChange([...filters, newFilter])
    },
    [fields, filters, onFiltersChange],
  )

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<ActiveFilter>) => {
      onFiltersChange(
        filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
      )
    },
    [filters, onFiltersChange],
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onFiltersChange(filters.filter((f) => f.id !== filterId))
    },
    [filters, onFiltersChange],
  )

  const handleToggleValue = useCallback(
    (fieldKey: string, value: string) => {
      const existing = filters.find((f) => f.field === fieldKey)
      if (!existing) {
        const field = fields.find((f) => f.key === fieldKey)
        const defaultOp =
          field?.defaultOperator ||
          DEFAULT_OPERATORS[field?.type || "multiselect"]?.[0]?.value ||
          "is_any_of"
        onFiltersChange([
          ...filters,
          createFilter(fieldKey, defaultOp, [value]),
        ])
        return
      }
      const has = existing.values.includes(value)
      const nextValues = has
        ? existing.values.filter((v) => v !== value)
        : [...existing.values, value]
      if (nextValues.length === 0) {
        onFiltersChange(filters.filter((f) => f.id !== existing.id))
      } else {
        onFiltersChange(
          filters.map((f) =>
            f.id === existing.id ? { ...f, values: nextValues } : f,
          ),
        )
      }
    },
    [fields, filters, onFiltersChange],
  )

  return (
    <FilterSizeContext.Provider value={{ size }}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <FiltersTrigger
          fields={fields}
          filters={filters}
          onSelectField={addFilter}
          onToggleValue={handleToggleValue}
          size={size}
        />

        {filters.map((af) => {
          const field = fields.find((f) => f.key === af.field)
          if (!field) return null
          return (
            <FilterChip
              key={af.id}
              field={field}
              active={af}
              onUpdateOperator={(operator) => updateFilter(af.id, { operator })}
              onToggleValue={(value) => {
                const has = af.values.includes(value)
                const nextValues = has
                  ? af.values.filter((v) => v !== value)
                  : [...af.values, value]
                updateFilter(af.id, { values: nextValues })
              }}
              onSetValues={(values) => updateFilter(af.id, { values })}
              onRemove={() => removeFilter(af.id)}
            />
          )
        })}
      </div>
    </FilterSizeContext.Provider>
  )
}

export {
  Filters,
  FiltersTrigger,
  countSelected,
  createFilter,
  toggleFilterValue,
}
export type { ActiveFilter, FilterField, FilterOperator, FilterOption }
