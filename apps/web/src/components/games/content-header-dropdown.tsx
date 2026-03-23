import { type ReactNode, useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  contentClassName,
  triggerClassName,
}: {
  value: string
  triggerLabel: ReactNode
  onValueChange: (value: string) => void
  contentClassName?: string
  triggerClassName?: string
} & (
  | { options: ContentHeaderDropdownOption[]; groups?: undefined }
  | { options?: undefined; groups: ContentHeaderDropdownGroup[] }
)) {
  const items = useMemo(() => {
    if (groups) {
      return groups.flatMap((g) =>
        g.options.map((o) => ({ value: o.value, label: String(o.label) })),
      )
    }
    return options.map((o) => ({ value: o.value, label: String(o.label) }))
  }, [groups, options])

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => {
        if (v !== null) onValueChange(v)
      }}
    >
      <SelectTrigger className={cn("w-fit text-xs", triggerClassName)}>
        <span className="min-w-0 truncate">{triggerLabel}</span>
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {groups
          ? groups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
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
