import * as React from "react"

import { cn } from "~/lib/utils"

function StatusIndicator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-indicator"
      {...props}
      className={cn(
        "relative flex size-2 shrink-0 rounded-full",
        "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-inherit",
        "after:absolute after:inset-[2px] after:rounded-full after:bg-inherit",
        className,
      )}
    />
  )
}

export { StatusIndicator }
