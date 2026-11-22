import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { INSIGHTS_RANGES } from "~/lib/insights/schemas"

const ITEMS = INSIGHTS_RANGES.map((days) => ({
  value: String(days),
  label: `${days} days`,
}))

export function RangeSelect({
  days,
  onChange,
}: {
  days: number
  onChange: (days: number) => void
}) {
  return (
    <Select
      items={ITEMS}
      value={String(days)}
      onValueChange={(value) => onChange(Number(value))}
    >
      <SelectTrigger size="sm" aria-label="date range" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
