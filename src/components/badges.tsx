import { Link } from "@tanstack/react-router"
import { createSerializer, parseAsArrayOf, parseAsString } from "nuqs"

import { Badge, badgeVariants } from "~/components/ui/badge"
import { type UserDiscipline } from "~/db/schema"
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

const disciplinesSerializer = createSerializer({
  disciplines: parseAsArrayOf(parseAsString),
})

const tagsSerializer = createSerializer({
  tags: parseAsArrayOf(parseAsString),
})

type BadgesProps = {
  content: null | string[]
  active?: string[]
  clickable?: "disciplines" | "tags"
}

export function Badges({ content, active, clickable }: BadgesProps) {
  if (!content || content.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {content.map((item) => {
        const isActive = active?.includes(item)
        const className = cn(
          "border-border",
          isActive && "bg-primary text-primary-foreground",
        )

        if (clickable) {
          // Toggle behavior: add if not active, remove if active
          const newSelection = isActive
            ? (active ?? []).filter((a) => a !== item)
            : [...(active ?? []), item]

          const to =
            clickable === "disciplines"
              ? disciplinesSerializer("/users", {
                  disciplines: newSelection.length > 0 ? newSelection : null,
                })
              : tagsSerializer("/posts", {
                  tags: newSelection.length > 0 ? newSelection : null,
                })

          return (
            <Link
              key={item}
              to={to}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={cn(badgeVariants({ variant: "secondary" }), className)}
            >
              {item}
            </Link>
          )
        }

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

export function DisciplineBadge({
  discipline,
}: {
  discipline: UserDiscipline
}) {
  return <Badge variant="secondary">{DISCIPLINE_LABELS[discipline]}</Badge>
}
