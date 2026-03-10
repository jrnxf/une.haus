import { Badge } from "~/components/ui/badge"
import { USER_DISCIPLINES, type UserDiscipline } from "~/db/schema"
import { cn } from "~/lib/utils"

const DISCIPLINE_LABELS: Record<UserDiscipline, string> = {
  street: "street",
  flatland: "flatland",
  trials: "trials",
  freestyle: "freestyle",
  mountain: "mountain",
  distance: "distance",
  other: "other",
}

export function DisciplineSelector({
  value,
  onChange,
}: {
  value: UserDiscipline[]
  onChange: (disciplines: UserDiscipline[]) => void
}) {
  const toggleDiscipline = (discipline: UserDiscipline) => {
    if (value.includes(discipline)) {
      onChange(value.filter((d) => d !== discipline))
    } else {
      onChange([...value, discipline])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {USER_DISCIPLINES.map((discipline) => {
        const isSelected = value.includes(discipline)
        return (
          <button
            key={discipline}
            type="button"
            onClick={() => toggleDiscipline(discipline)}
          >
            <Badge
              variant={isSelected ? "default" : "secondary"}
              className={cn(
                "cursor-pointer transition-colors",
                !isSelected && "hover:bg-accent",
              )}
            >
              {DISCIPLINE_LABELS[discipline]}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
