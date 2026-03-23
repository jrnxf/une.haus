import { CheckIcon, FilterIcon, XIcon } from "lucide-react"
import { createContext, useCallback, useContext } from "react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "~/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
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

type FilterSizeContextValue = {
  size: "sm" | "default"
}

const FilterSizeContext = createContext<FilterSizeContextValue>({
  size: "default",
})

// --- Recursive option items for dropdown menus ---

function OptionItems({
  options,
  values,
  onToggle,
  isSelect,
}: {
  options: FilterOption[]
  values: string[]
  onToggle: (value: string) => void
  isSelect?: boolean
}) {
  const branchItems = options.filter((o) => o.children)
  const selectedLeaves = options.filter(
    (o) => !o.children && values.includes(o.value),
  )
  const unselectedLeaves = options.filter(
    (o) => !o.children && !values.includes(o.value),
  )

  return (
    <>
      {branchItems.map((option) => {
        const count = countSelected(option.children!, values)
        return (
          <DropdownMenuSub key={option.value}>
            <DropdownMenuSubTrigger>
              <span className="flex-1">{option.label}</span>
              {count > 0 && (
                <Badge variant="secondary" className="mr-1 px-1 text-xs">
                  {count}
                </Badge>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[200px]">
              <OptionItems
                options={option.children!}
                values={values}
                onToggle={onToggle}
                isSelect={isSelect}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )
      })}

      {branchItems.length > 0 &&
        (selectedLeaves.length > 0 || unselectedLeaves.length > 0) && (
          <DropdownMenuSeparator />
        )}

      {selectedLeaves.length > 0 && (
        <DropdownMenuGroup>
          {selectedLeaves.map((option) =>
            isSelect ? (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onToggle(option.value)}
              >
                <CheckIcon className="text-primary size-4" />
                <span className="truncate">{option.label}</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked
                onCheckedChange={() => onToggle(option.value)}
              >
                <CheckIcon className="text-primary size-4" />
                <span className="truncate">{option.label}</span>
              </DropdownMenuCheckboxItem>
            ),
          )}
        </DropdownMenuGroup>
      )}

      {selectedLeaves.length > 0 && unselectedLeaves.length > 0 && (
        <DropdownMenuSeparator />
      )}

      {unselectedLeaves.length > 0 && (
        <DropdownMenuGroup>
          {unselectedLeaves.map((option) =>
            isSelect ? (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onToggle(option.value)}
              >
                <CheckIcon className="size-4 opacity-0" />
                <span className="truncate">{option.label}</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={false}
                onCheckedChange={() => onToggle(option.value)}
              >
                <CheckIcon className="size-4 opacity-0" />
                <span className="truncate">{option.label}</span>
              </DropdownMenuCheckboxItem>
            ),
          )}
        </DropdownMenuGroup>
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
          />
        }
      >
        {operatorLabel}
      </DropdownMenuTrigger>
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

function FilterValueDropdown({
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
  const isSelect = field.type === "select"

  const options = field.options ?? []
  const selectedOptions = findSelectedLeaves(options, values)
  const displayLabel =
    selectedOptions.length === 1
      ? selectedOptions[0].label
      : selectedOptions.length > 0
        ? `${selectedOptions.length} selected`
        : "select..."

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size={size} />}>
        {displayLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <OptionItems
          options={options}
          values={values}
          onToggle={isSelect ? (value) => onSelectSingle?.(value) : onToggle}
          isSelect={isSelect}
        />
      </DropdownMenuContent>
    </DropdownMenu>
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
        <FilterValueDropdown
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

// --- Add-filter dropdown (field picker) ---

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
  const activeFieldKeys = new Set(filters.map((f) => f.field))
  const availableFields = getFieldsSortedByActive(fields, filters).filter(
    (field) => !activeFieldKeys.has(field.key),
  )

  if (availableFields.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size={size ?? "sm"} />}
      >
        <FilterIcon className="size-3.5" />
        filters
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {availableFields.map((field) => (
          <DropdownMenuItem
            key={field.key}
            onClick={() => onSelectField?.(field.key)}
            className="justify-between"
          >
            <span>{field.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  Filters,
  getFieldsSortedByActive,
  toggleFilterByField,
  toggleFilterValue,
}
export type { ActiveFilter, FilterField, FilterOption }
