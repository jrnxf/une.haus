import { Badge } from "~/components/ui/badge"
import { type UserDiscipline } from "~/db/schema"
import { cn } from "~/lib/utils"

type BadgesProps = {
  content: null | string[]
  active?: string[]
}

export function Badges({ content, active }: BadgesProps) {
  if (!content || content.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {content.map((item) => {
        const isActive = active?.includes(item)
        const className = cn(
          "border-border",
          isActive && "bg-primary text-primary-foreground",
        )

        return (
          <Badge
            className={cn(className, "hover:bg-secondary")}
            key={item}
            variant="secondary"
          >
            {item}
          </Badge>
        )
      })}
    </div>
  )
}

const DISCIPLINE_LABELS: Record<UserDiscipline, string> = {
  street: "street",
  flatland: "flatland",
  trials: "trials",
  freestyle: "freestyle",
  mountain: "mountain",
  distance: "distance",
  other: "other",
}

export function DisciplineBadge({
  discipline,
}: {
  discipline: UserDiscipline
}) {
  return <Badge variant="secondary">{DISCIPLINE_LABELS[discipline]}</Badge>
}
