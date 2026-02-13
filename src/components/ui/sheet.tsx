"use client"

import * as React from "react"
import { DrawerPreview as SheetPrimitive } from "@base-ui/react/drawer"
import { XIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

type SheetSide = "top" | "right" | "bottom" | "left"

const SheetSideContext = React.createContext<SheetSide>("right")

const sideToSwipeDirection = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left",
} as const

function Sheet({
  side = "right",
  ...props
}: SheetPrimitive.Root.Props & { side?: SheetSide }) {
  return (
    <SheetSideContext.Provider value={side}>
      <SheetPrimitive.Root
        data-slot="sheet"
        swipeDirection={sideToSwipeDirection[side]}
        {...props}
      />
    </SheetSideContext.Provider>
  )
}

function SheetTrigger({
  asChild,
  children,
  render,
  ...props
}: SheetPrimitive.Trigger.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </SheetPrimitive.Trigger>
  )
}

function SheetClose({
  asChild,
  children,
  render,
  ...props
}: SheetPrimitive.Close.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </SheetPrimitive.Close>
  )
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black opacity-[calc(0.1*(1-var(--drawer-swipe-progress)))] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[swiping]:duration-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  )
}

const viewportClasses: Record<SheetSide, string> = {
  right: "fixed inset-0 z-50 flex items-stretch justify-end",
  left: "fixed inset-0 z-50 flex items-stretch justify-start",
  bottom: "fixed inset-0 z-50 flex items-end",
  top: "fixed inset-0 z-50 flex items-start",
}

const popupClasses: Record<SheetSide, string> = {
  right:
    "h-full w-3/4 border-l sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]",
  left:
    "h-full w-3/4 border-r sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(-100%)] data-[ending-style]:[transform:translateX(-100%)]",
  bottom:
    "w-full border-t [transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(100%)] data-[ending-style]:[transform:translateY(100%)]",
  top:
    "w-full border-b [transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(-100%)] data-[ending-style]:[transform:translateY(-100%)]",
}

function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const side = React.useContext(SheetSideContext)
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Viewport className={viewportClasses[side]}>
        <SheetPrimitive.Popup
          data-slot="sheet-content"
          data-side={side}
          className={cn(
            "bg-background flex flex-col gap-4 bg-clip-padding text-sm shadow-lg transition-transform duration-200 ease-in-out data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
            popupClasses[side],
            className,
          )}
          {...props}
        >
          <SheetPrimitive.Content>
            {children}
            {showCloseButton && (
              <SheetPrimitive.Close
                data-slot="sheet-close"
                render={
                  <Button
                    variant="ghost"
                    className="absolute top-4 right-4"
                    size="icon-sm"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            )}
          </SheetPrimitive.Content>
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-medium", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
