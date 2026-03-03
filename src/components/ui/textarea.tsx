import { cn } from "~/lib/utils"

import type * as React from "react"

function Textarea({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value"> & {
  value?: string | null
}) {
  return (
    <textarea
      className={cn(
        "border-input ring-offset-background dark:bg-input/30 flex w-full rounded-md border bg-transparent px-3 py-2 text-base",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      rows={3}
      value={value ?? undefined}
      {...props}
    />
  )
}

export { Textarea }
