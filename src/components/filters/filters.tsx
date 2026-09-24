import { CheckIcon, FilterIcon, XIcon } from "lucide-react"
import { createContext, useCallback, useContext } from "react"

import {
  countSelected,
  DEFAULT_OPERATORS,
  findSelectedLeaves,
  getFieldsSortedByActive,
  toggleFilterByField,
} from "./filter-utils"
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

import type { ActiveFilter, FilterField, FilterOption } from "./filter-utils"

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
                <Badge variant="secondary" className="mr-1 px-1">
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
          data-slot="input"
          autoFocus
          aria-label={field.label}
          value={active.values[0] || ""}
          onChange={(e) => onSetValues([e.target.value])}
          placeholder={field.placeholder}
          className={cn(
            "border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 w-36 rounded-md border bg-clip-padding px-3 text-sm shadow-xs outline-none focus-visible:ring-3 sm:text-base",
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
        <FilterIcon data-icon="inline-start" className="size-3.5" />
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

export { Filters }
export type { ActiveFilter, FilterField } from "./filter-utils"
