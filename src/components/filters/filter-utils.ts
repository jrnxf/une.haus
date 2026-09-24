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

export {
  addFilterByField,
  countSelected,
  DEFAULT_OPERATORS,
  findSelectedLeaves,
  getFieldsSortedByActive,
  toggleFilterByField,
  toggleFilterValue,
}
export type { ActiveFilter, FilterField, FilterOption }
