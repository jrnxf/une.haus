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
    <p className={cn("text-muted-foreground text-sm", className)}>
      {filledParts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <> {separator} </>}
          {part}
        </Fragment>
      ))}
    </p>
  )
}
