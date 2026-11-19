import * as React from "react"

import { cn } from "~/lib/utils"

function Textarea({
  className,
  value,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "size"> & {
  value?: string | null
  // compact: one line at button height that grows with its text.
  size?: "default" | "compact"
}) {
  return (
    <textarea
      className={cn(
        "border-input ring-offset-background dark:bg-input/30 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm sm:text-base",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "compact" &&
          "field-sizing-content min-h-9 resize-none py-1.5 sm:text-sm",
        className,
      )}
      rows={size === "compact" ? 1 : 3}
      value={value ?? undefined}
      {...props}
    />
  )
}

export { Textarea }
