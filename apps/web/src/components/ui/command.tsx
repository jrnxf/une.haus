import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { Command as CommandPrimitive } from "cmdk"
import { Loader2Icon, SearchIcon } from "lucide-react"
import * as React from "react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Kbd, KbdGroup } from "~/components/ui/kbd"
import { ScrollBar } from "~/components/ui/scroll-area"
import { useModifierKey } from "~/hooks/use-modifier-key"
import { cn } from "~/lib/utils"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "text-popover-foreground dark:bg-input/30 flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent",
        // flips the command input and list if the popover is on top - means the input is always close to the trigger
        "group-data-[side=top]/popover-content:flex-col-reverse",
        className,
      )}
      {...props}
      loop
    />
  )
}

function CommandDialog({
  title = "command palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  showTrigger = true,
  overlay,
  footer,
  onValueChange,
  value,
  shouldFilter = true,
  viewportClassName,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  children?: React.ReactNode
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  showTrigger?: boolean
  overlay?: boolean
  footer?: React.ReactNode
  onValueChange?: (value: string) => void
  value?: string
  shouldFilter?: boolean
  viewportClassName?: string
}) {
  const modifierKey = useModifierKey()

  return (
    <Dialog {...props}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button aria-label="open command palette" size="sm" variant="ghost">
            <KbdGroup>
              <Kbd>{modifierKey}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className={cn(
          "flex max-h-[min(400px,calc(100vh-100px))] flex-col gap-0 overflow-hidden p-0",
          className,
        )}
        showCloseButton={showCloseButton}
        overlay={overlay}
        viewportClassName={viewportClassName}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command
          value={value}
          onValueChange={onValueChange}
          shouldFilter={shouldFilter}
          className="**:[[cmdk-group-heading]]:text-muted-foreground min-h-0 flex-1 rounded-none [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:min-h-12 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group]]:px-2"
        >
          {children}
        </Command>
        {footer}
      </DialogContent>
    </Dialog>
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="text-muted-foreground py-3 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground overflow-hidden p-1",
        "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className,
      )}
      {...props}
    />
  )
}

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    isFetching?: boolean
    containerClassName?: string
  }
>(({ className, isFetching, containerClassName, ...props }, ref) => {
  return (
    <div
      className={cn(
        "flex h-9 min-h-9 items-center gap-2 px-3",
        "border-b",
        "group-data-[side=top]/popover-content:border-t group-data-[side=top]/popover-content:border-b-0",
        containerClassName,
      )}
      data-slot="command-input-wrapper"
    >
      {isFetching ? (
        <Loader2Icon className="text-muted-foreground size-4 shrink-0 animate-spin" />
      ) : (
        <SearchIcon className="text-muted-foreground size-4 shrink-0" />
      )}
      <CommandPrimitive.Input
        ref={ref}
        data-slot="command-input"
        className={cn(
          "placeholder:text-muted-foreground h-full w-full bg-transparent outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  )
})
CommandInput.displayName = "CommandInput"

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm p-2 outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Darker Kbd styling when selected
        "data-[selected=true]:[&_[data-slot=kbd]]:bg-accent-foreground/20 data-[selected=true]:[&_[data-slot=kbd]]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  )
}

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    data-slot="command-list"
    className={cn(
      "relative flex min-h-0 grow flex-col overflow-hidden not-last-of-type:pb-1",
      className,
    )}
  >
    <ScrollAreaPrimitive.Viewport
      ref={ref}
      data-slot="scroll-area-viewport"
      className="min-h-0 w-full flex-1"
    >
      <CommandPrimitive.List
        className="!max-h-[none] !overflow-visible"
        {...props}
      >
        {children}
      </CommandPrimitive.List>
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
CommandList.displayName = "CommandList"

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  )
}

export { Kbd, KbdGroup } from "~/components/ui/kbd"
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
