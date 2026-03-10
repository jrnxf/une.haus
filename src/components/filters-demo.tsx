import { useState } from "react"

import {
  Filters,
  type ActiveFilter,
  type FilterField,
  type FilterOption,
} from "~/components/filters/filters"

const STATUSES: FilterOption[] = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
]

const ELEMENTS: FilterOption[] = [
  {
    value: "spins",
    label: "spins",
    children: [
      { value: "spin", label: "spin" },
      { value: "rev", label: "rev" },
    ],
  },
  {
    value: "flips",
    label: "flips",
    children: [
      { value: "flip", label: "flip" },
      { value: "kickflip", label: "kickflip" },
    ],
  },
  {
    value: "grinds",
    label: "grinds",
    children: [
      { value: "grind", label: "grind" },
      { value: "coast", label: "coast" },
    ],
  },
  { value: "wrap", label: "wrap" },
  { value: "twist", label: "twist" },
  { value: "roll", label: "roll" },
  { value: "walk", label: "walk" },
  { value: "glide", label: "glide" },
  { value: "mount", label: "mount" },
  { value: "hop", label: "hop" },
]

const PRIORITIES: FilterOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical" },
]

const FIELDS: FilterField[] = [
  { key: "status", label: "Status", options: STATUSES },
  {
    key: "elements",
    label: "Elements",
    type: "multiselect",
    options: ELEMENTS,
  },
  { key: "priority", label: "Priority", options: PRIORITIES },
]

export function FiltersDemo() {
  const [filters, setFilters] = useState<ActiveFilter[]>([
    {
      id: "demo-1",
      field: "elements",
      operator: "contain",
      values: ["spin", "flip"],
    },
  ])

  return (
    <div className="flex flex-col gap-4">
      <Filters fields={FIELDS} filters={filters} onFiltersChange={setFilters} />

      <pre className="bg-muted dark:bg-muted/60 max-h-[400px] w-full max-w-[500px] overflow-auto rounded-md border p-4 text-xs">
        {JSON.stringify(filters, null, 2)}
      </pre>
    </div>
  )
}
