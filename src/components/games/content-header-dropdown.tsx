import { type ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select"
import { cn } from "~/lib/utils"

type ContentHeaderDropdownOption = {
  value: string
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export function ContentHeaderDropdown({
  value,
  triggerLabel,
  options,
  onValueChange,
  align = "start",
  contentClassName,
  triggerClassName,
}: {
  value: string
  triggerLabel: ReactNode
  options: ContentHeaderDropdownOption[]
  onValueChange: (value: string | null) => void
  align?: "start" | "center" | "end"
  contentClassName?: string
  triggerClassName?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-fit text-xs", triggerClassName)}>
        <span className="min-w-0 truncate">{triggerLabel}</span>
      </SelectTrigger>
      <SelectContent align={align} className={contentClassName}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="min-w-0 items-start"
          >
            <div className="flex min-w-0 flex-col items-start">
              <div className="min-w-0 truncate">{option.label}</div>
              {option.description ? (
                <span className="text-muted-foreground text-xs leading-tight">
                  {option.description}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
