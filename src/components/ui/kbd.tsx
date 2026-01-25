import { cn } from "~/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10 [[data-highlighted]_&]:bg-black/10 [[data-highlighted]_&]:text-accent-foreground dark:[[data-highlighted]_&]:bg-white/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex items-center justify-center select-none",
        "[[data-slot=kbd-group]_&]:rounded-none [[data-slot=kbd-group]_&]:first:rounded-l-sm [[data-slot=kbd-group]_&]:last:rounded-r-sm",
        "[[data-slot=kbd-group]_&]:min-w-0 [[data-slot=kbd-group]_&]:px-0.5 [[data-slot=kbd-group]_&]:first:pl-1 [[data-slot=kbd-group]_&]:last:pr-1",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
