import { cn } from "~/lib/utils"

const symbols = /^[⌘⌃⌥⇧⌫⏎↵↑↓←→⎋⇥]+$/

function Kbd({ className, children, ...props }: React.ComponentProps<"kbd">) {
  const isSymbol = typeof children === "string" && symbols.test(children)

  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground [[data-highlighted]_&]:text-accent-foreground [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10 pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 text-xs font-medium select-none [&_svg:not([class*='size-'])]:size-3 [[data-highlighted]_&]:bg-black/10 dark:[[data-highlighted]_&]:bg-white/10",
        isSymbol ? "font-sans" : "font-mono",
        "[[data-slot=kbd-group]_&]:rounded-none [[data-slot=kbd-group]_&]:first:rounded-l-sm [[data-slot=kbd-group]_&]:last:rounded-r-sm",
        "[[data-slot=kbd-group]_&]:min-w-0 [[data-slot=kbd-group]_&]:px-0.5 [[data-slot=kbd-group]_&]:first:pl-1 [[data-slot=kbd-group]_&]:last:pr-1",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
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
