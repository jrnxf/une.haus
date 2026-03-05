import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "~/lib/utils"

const statusVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-muted-foreground **:data-[slot=status-indicator]:bg-muted-foreground border-transparent",
        success:
          "border-green-500/20 bg-green-500/10 text-green-600 **:data-[slot=status-indicator]:bg-green-600 dark:text-green-400 **:data-[slot=status-indicator]:dark:bg-green-400",
        error:
          "border-destructive/20 bg-destructive/10 text-destructive **:data-[slot=status-indicator]:bg-destructive",
        warning:
          "border-orange-500/20 bg-orange-500/10 text-orange-600 **:data-[slot=status-indicator]:bg-orange-600 dark:text-orange-400 **:data-[slot=status-indicator]:dark:bg-orange-400",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-600 **:data-[slot=status-indicator]:bg-blue-600 dark:text-blue-400 **:data-[slot=status-indicator]:dark:bg-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type StatusProps = React.ComponentProps<"div"> &
  VariantProps<typeof statusVariants>

function Status({ className, variant = "default", ...props }: StatusProps) {
  return (
    <div
      data-slot="status"
      data-variant={variant}
      {...props}
      className={cn(statusVariants({ variant }), className)}
    />
  )
}

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

function StatusLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-label"
      {...props}
      className={cn("leading-none", className)}
    />
  )
}

export { Status, StatusIndicator, StatusLabel, statusVariants }
