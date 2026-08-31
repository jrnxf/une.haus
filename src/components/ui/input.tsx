import * as React from "react"

import { cn } from "~/lib/utils"

function Input({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<"input">, "value"> & {
  value?: string | null
}) {
  return (
    <input
      className={cn(
        "border-input ring-offset-background dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm sm:text-base",
        "file:border-0 file:bg-transparent file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      value={value ?? undefined}
      {...props}
    />
  )
}

export { Input }
