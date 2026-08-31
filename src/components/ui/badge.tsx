import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "focus:ring-ring inline-flex items-center rounded-full border px-2 py-px text-xs font-semibold focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
        destructive:
          "bg-destructive-bg text-destructive hover:bg-destructive-bg-hover border-transparent",
        outline: "text-muted-foreground",
        secondary:
          "bg-secondary text-muted-foreground hover:bg-secondary/80 border-transparent",
      },
    },
  },
)

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...properties }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...properties}
    />
  )
}

export { Badge, badgeVariants }
