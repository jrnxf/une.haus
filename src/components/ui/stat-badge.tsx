import pluralize from "pluralize"

import { cn } from "~/lib/utils"

import type { ComponentType } from "react"

export type StatBadgeProps = {
  icon: ComponentType<{ className?: string }>
  count: number
  label: string
  className?: string
}

export function StatBadge({
  icon: Icon,
  count,
  label,
  className,
}: StatBadgeProps) {
  const statLabel = `${count} ${pluralize(label, count)}`

  return (
    <div
      className={cn("text-muted-foreground flex items-center gap-1", className)}
      title={statLabel}
    >
      <Icon aria-hidden className="size-[1em] shrink-0" />
      <span aria-hidden className="tabular-nums">
        {count}
      </span>
      <span className="sr-only">{statLabel}</span>
    </div>
  )
}
