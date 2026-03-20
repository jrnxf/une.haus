import { type ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
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

type ContentHeaderDropdownGroup = {
  label: string
  options: ContentHeaderDropdownOption[]
}

export function ContentHeaderDropdown({
  value,
  triggerLabel,
  options,
  groups,
  onValueChange,
  align = "start",
  contentClassName,
  triggerClassName,
}: {
  value: string
  triggerLabel: ReactNode
  onValueChange: (value: string | null) => void
  align?: "start" | "center" | "end"
  contentClassName?: string
  triggerClassName?: string
} & (
  | { options: ContentHeaderDropdownOption[]; groups?: undefined }
  | { options?: undefined; groups: ContentHeaderDropdownGroup[] }
)) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-fit text-xs", triggerClassName)}>
        <span className="min-w-0 truncate">{triggerLabel}</span>
      </SelectTrigger>
      <SelectContent align={align} className={contentClassName}>
        {groups
          ? groups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectGroupLabel>{group.label}</SelectGroupLabel>
                {group.options.map((option) => (
                  <DropdownItem key={option.value} option={option} />
                ))}
              </SelectGroup>
            ))
          : options.map((option) => (
              <DropdownItem key={option.value} option={option} />
            ))}
      </SelectContent>
    </Select>
  )
}

function DropdownItem({ option }: { option: ContentHeaderDropdownOption }) {
  return (
    <SelectItem
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
  )
}
