import { Fragment, type ReactNode } from "react"

import { cn } from "~/lib/utils"

type MetalineProps = {
  parts: ReactNode[]
  className?: string
  separator?: ReactNode
}

function hasContent(part: ReactNode) {
  return part !== null && part !== undefined && part !== false && part !== ""
}

const SlashSeparator = () => (
  <span aria-hidden className="opacity-25">
    /
  </span>
)

export function Metaline({
  parts,
  className,
  separator = <SlashSeparator />,
}: MetalineProps) {
  const filledParts = parts.filter(hasContent)

  if (filledParts.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "text-foreground/50 inline-flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm",
        className,
      )}
    >
      {filledParts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <> {separator} </>}
          {part}
        </Fragment>
      ))}
    </div>
  )
}
