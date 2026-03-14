import { type ReactNode } from "react"

import { cn } from "~/lib/utils"

export function ContentHeaderRow({
  left,
  right,
  className,
  sticky = false,
}: {
  left?: ReactNode
  right?: ReactNode
  className?: string
  sticky?: boolean
}) {
  const hasLeft = Boolean(left)

  const content = (
    <div
      className={cn(
        "mx-auto flex w-full max-w-5xl items-center justify-between gap-2",
        className,
      )}
    >
      {hasLeft ? <div className="flex gap-2">{left}</div> : null}
      {right ? <div className="flex gap-2">{right}</div> : null}
    </div>
  )

  if (!sticky) return content

  return <div className="bg-background sticky top-0 z-10">{content}</div>
}
