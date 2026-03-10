import { useState } from "react"

import { Badge } from "~/components/ui/badge"

export function BadgeInput<T extends string>({
  defaultSelections,
  onChange,
  options,
}: {
  defaultSelections: null | T[] | undefined
  onChange: (options: T[]) => void
  options: readonly T[]
}) {
  const [selections, setSelections] = useState(defaultSelections ?? [])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selections.includes(option)
        return (
          <button
            aria-label={isSelected ? `Remove ${option}` : `Select ${option}`}
            aria-pressed={isSelected}
            key={option}
            onClick={() => {
              const nextSelections = isSelected
                ? selections.filter((s) => s !== option)
                : [...selections, option]
              setSelections(nextSelections)
              onChange(nextSelections)
            }}
            type="button"
          >
            <Badge variant={isSelected ? "default" : "outline"}>{option}</Badge>
          </button>
        )
      })}
    </div>
  )
}
