import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react"
import { CheckIcon, ChevronRightIcon, FilterIcon, XIcon } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

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
    { value: "contain", label: "contain" },
    { value: "equal", label: "equal" },
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

function findSelectedLeaves(
  options: FilterOption[],
  values: string[],
): FilterOption[] {
  return options.flatMap((opt) => {
    if (opt.children) return findSelectedLeaves(opt.children, values)
    return values.includes(opt.value) ? [opt] : []
  })
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

function getDefaultOperator(field: FilterField): string {
  return (
    field.defaultOperator ||
    DEFAULT_OPERATORS[field.type || "select"]?.[0]?.value ||
    "is"
  )
}

function addFilterByField(
  filters: ActiveFilter[],
  fields: FilterField[],
  fieldKey: string,
): ActiveFilter[] {
  if (filters.some((f) => f.field === fieldKey)) return filters
  const field = fields.find((f) => f.key === fieldKey)
  if (!field) return filters

  return [...filters, createFilter(fieldKey, getDefaultOperator(field))]
}

function getFieldsSortedByActive(
  fields: FilterField[],
  filters: ActiveFilter[],
): FilterField[] {
  const activeFieldKeys = new Set(filters.map((f) => f.field))

  return fields
    .map((field, index) => ({
      field,
      index,
      isActive: activeFieldKeys.has(field.key),
    }))
    .toSorted(
      (a, b) => Number(a.isActive) - Number(b.isActive) || a.index - b.index,
    )
    .map(({ field }) => field)
}

function toggleFilterByField(
  filters: ActiveFilter[],
  fields: FilterField[],
  fieldKey: string,
): ActiveFilter[] {
  if (filters.some((f) => f.field === fieldKey)) {
    return filters.filter((f) => f.field !== fieldKey)
  }

  return addFilterByField(filters, fields, fieldKey)
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
  const { refs, floatingStyles, update } = useFloating({
    strategy: "absolute",
    placement: "right-start",
    middleware: [offset(2), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    if (!anchorEl) return
    refs.setReference(anchorEl)
    void update()
  }, [anchorEl, refs, update])

  if (!anchorEl) return null

  return (
    <div
      ref={refs.setFloating}
      data-slot="filter-panel"
      className="bg-popover text-popover-foreground border-border z-99 w-[200px] rounded-md border"
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
    </div>
  )
}

// --- Recursive options menu (handles branches + leaves at any depth) ---

function OptionsMenu({
  options,
  values,
  onToggle,
  onClose,
  onSelectSingle,
  autoFocusInput = false,
}: {
  options: FilterOption[]
  values: string[]
  onToggle: (value: string) => void
  onClose: () => void
  onSelectSingle?: (value: string) => void
  autoFocusInput?: boolean
}) {
  const commandRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [openSub, setOpenSub] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const closeSub = useCallback(() => {
    setOpenSub(null)
  }, [])

  const closeSubAndFocusInput = useCallback(() => {
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
        // Let cmdk manage active row; we only manage selected values.
      } else {
        // Let cmdk manage active row; we only manage selected values.
      }
      onToggle(value)
      setSearch("")
    },
    [values, onToggle, onSelectSingle],
  )

  useEffect(() => {
    if (!autoFocusInput) return
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(id)
  }, [autoFocusInput])

  return (
    <>
      <Command
        ref={commandRef}
        className={cn("bg-popover dark:bg-popover", compactItems)}
      >
        <CommandInput
          ref={inputRef}
          placeholder="search..."
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              const selectedItem =
                commandRef.current?.querySelector<HTMLElement>(
                  '[data-slot="command-item"][data-selected="true"]',
                )
              const selectedLabel = selectedItem?.dataset.value
              const selectedOption = options.find(
                (o) => o.label.toLowerCase() === selectedLabel?.toLowerCase(),
              )
              if (selectedOption?.children) {
                e.preventDefault()
                setOpenSub(selectedOption.value)
              }
            } else if (e.key === "ArrowLeft") {
              if (openSub) {
                e.preventDefault()
                closeSubAndFocusInput()
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
              if (openSub) closeSubAndFocusInput()
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
                      onPointerEnter={() => {
                        setOpenSub(option.value)
                      }}
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
                  value={option.label}
                  onPointerEnter={() => setOpenSub(null)}
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
                  value={option.label}
                  onPointerEnter={() => setOpenSub(null)}
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
        <SubPanel anchorEl={anchorEl} onClose={closeSubAndFocusInput}>
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
  const selectedOptions = findSelectedLeaves(options, values)
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
        className="text-muted-foreground hover:text-foreground"
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
  size,
}: {
  fields: FilterField[]
  filters: ActiveFilter[]
  onSelectField?: (fieldKey: string) => void
  size?: "sm" | "default"
}) {
  const [open, setOpen] = useState(false)
  const activeFieldKeys = new Set(filters.map((f) => f.field))
  const availableFields = getFieldsSortedByActive(fields, filters).filter(
    (field) => !activeFieldKeys.has(field.key),
  )

  if (availableFields.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size ?? "sm"}>
          <FilterIcon className="size-3.5" />
          filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="relative w-[220px] gap-0 p-0" align="start">
        <Command className={cn("bg-popover dark:bg-popover", compactItems)}>
          <CommandList>
            {availableFields.length === 0 ? (
              <CommandEmpty>no fields</CommandEmpty>
            ) : (
              <CommandGroup>
                {availableFields.map((field) => {
                  return (
                    <CommandItem
                      key={field.key}
                      value={field.label}
                      className="justify-between"
                      onSelect={() => {
                        onSelectField?.(field.key)
                        setOpen(false)
                      }}
                    >
                      <span>{field.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
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
  const toggleFieldFilter = useCallback(
    (fieldKey: string) => {
      const nextFilters = toggleFilterByField(filters, fields, fieldKey)
      if (nextFilters === filters) return
      onFiltersChange(nextFilters)
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

  return (
    <FilterSizeContext.Provider value={{ size }}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <FiltersTrigger
          fields={fields}
          filters={filters}
          onSelectField={toggleFieldFilter}
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
  addFilterByField,
  countSelected,
  createFilter,
  Filters,
  FiltersTrigger,
  getFieldsSortedByActive,
  toggleFilterByField,
  toggleFilterValue,
}
export type { ActiveFilter, FilterField, FilterOperator, FilterOption }
