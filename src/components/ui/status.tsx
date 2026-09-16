import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "~/lib/utils"

const statusIndicatorVariants = cva(
  [
    "relative flex size-2 shrink-0 rounded-full",
    "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-inherit",
    "after:absolute after:inset-[2px] after:rounded-full after:bg-inherit",
  ],
  {
    variants: {
      status: {
        online: "bg-online",
        away: "bg-away",
        busy: "bg-busy",
      },
    },
    defaultVariants: {
      status: "online",
    },
  },
)

type StatusIndicatorProps = React.ComponentProps<"div"> &
  VariantProps<typeof statusIndicatorVariants>

function StatusIndicator({
  className,
  status,
  ...props
}: StatusIndicatorProps) {
  return (
    <div
      data-slot="status-indicator"
      data-status={status}
      {...props}
      className={cn(statusIndicatorVariants({ status }), className)}
    />
  )
}

export { StatusIndicator }
