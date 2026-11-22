import { type ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

// A card with a small title, the frame for every chart and table on
// /admin/insights. `flush` drops the content padding for tables.
export function Panel({
  title,
  hint,
  aside,
  flush = false,
  className,
  children,
}: {
  title: string
  hint?: string
  aside?: ReactNode
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  const heading = (
    <CardTitle className={cn("text-sm font-medium", hint && "cursor-help")}>
      {title}
    </CardTitle>
  )

  return (
    <Card
      className={cn(
        "flex flex-col",
        flush ? "gap-0 overflow-hidden py-0" : "py-4",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between gap-2",
          flush && "py-4",
        )}
      >
        {hint ? (
          <Tooltip>
            <TooltipTrigger asChild>{heading}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-56">
              {hint}
            </TooltipContent>
          </Tooltip>
        ) : (
          heading
        )}
        {aside}
      </CardHeader>
      <CardContent className={cn("min-h-0 flex-1", flush && "p-0")}>
        {flush ? (
          <div className="overflow-x-auto border-t">{children}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground p-4 text-sm">{children}</p>
}
