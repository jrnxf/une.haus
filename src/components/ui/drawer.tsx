import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import * as React from "react"

import { cn } from "~/lib/utils"

type DrawerDirection = "top" | "bottom" | "left" | "right"

const DrawerDirectionContext = React.createContext<DrawerDirection>("bottom")

const directionToSwipeDirection = {
  top: "up",
  bottom: "down",
  left: "left",
  right: "right",
} as const

function Drawer({
  direction = "bottom",
  ...props
}: Omit<DrawerPrimitive.Root.Props, "swipeDirection"> & {
  direction?: DrawerDirection
}) {
  return (
    <DrawerDirectionContext.Provider value={direction}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        swipeDirection={directionToSwipeDirection[direction]}
        {...props}
      />
    </DrawerDirectionContext.Provider>
  )
}

function DrawerTrigger({
  asChild,
  children,
  render,
  ...props
}: DrawerPrimitive.Trigger.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children
  return (
    <DrawerPrimitive.Trigger
      data-slot="drawer-trigger"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </DrawerPrimitive.Trigger>
  )
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  asChild,
  children,
  render,
  ...props
}: DrawerPrimitive.Close.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children
  return (
    <DrawerPrimitive.Close
      data-slot="drawer-close"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </DrawerPrimitive.Close>
  )
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black opacity-[calc(0.3*(1-var(--drawer-swipe-progress)))] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-[starting-style]:opacity-0 data-[swiping]:duration-0",
        className,
      )}
      {...props}
    />
  )
}

const viewportClasses: Record<DrawerDirection, string> = {
  bottom: "fixed inset-0 z-50 flex items-end",
  top: "fixed inset-0 z-50 flex items-start",
  right: "fixed inset-0 z-50 flex items-stretch justify-end",
  left: "fixed inset-0 z-50 flex items-stretch justify-start",
}

/**
 * Nested-drawer stacking for bottom drawers.
 *
 * https://base-ui.com/react/components/drawer#nested-drawers
 *
 * Base UI sets these CSS variables on nested Drawer.Popup elements:
 *   --nested-drawers          stack depth (0 = frontmost)
 *   --drawer-height            this popup's height
 *   --drawer-frontmost-height  frontmost open popup's height
 *   --drawer-swipe-progress    0→1 as user swipes to dismiss
 *   --drawer-swipe-movement-y  pixel offset during swipe
 *
 * The popup uses a negative bottom margin (--bleed) so each drawer peeks
 * behind the one in front. Parent drawers scale down and translate up so
 * the frontmost drawer stays anchored at the bottom.
 */
const nestedBottomPopup = cn(
  // Custom properties that drive the stacking math
  "[--bleed:3rem]",
  "[--peek:1rem]",
  "[--stack-progress:clamp(0,var(--drawer-swipe-progress),1)]",
  "[--stack-step:0.05]",
  "[--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))]",
  "[--scale-base:calc(max(0,1-(var(--nested-drawers)*var(--stack-step))))]",
  "[--scale:clamp(0,calc(var(--scale-base)+(var(--stack-step)*var(--stack-progress))),1)]",
  "[--shrink:calc(1-var(--scale))]",
  "[--height:max(0px,calc(var(--drawer-frontmost-height,var(--drawer-height))-var(--bleed)))]",

  // Layout
  "group/popup relative -mb-[3rem] max-h-[calc(80vh+3rem)] w-full",
  "[height:var(--drawer-height,auto)]",
  "rounded-t-2xl border-t",
  "pb-0",
  "touch-auto overflow-y-auto overscroll-contain",

  // Transform: translate for swipe + peek offset + scale for stacking
  "[transform-origin:50%_calc(100%-var(--bleed))]",
  "[transform:translateY(calc(var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--shrink)*var(--height))))_scale(var(--scale))]",

  // Overlay pseudo-element that dims parent content when nested drawer is open
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-transparent after:content-['']",
  "after:transition-[background-color] after:duration-[450ms] after:ease-[cubic-bezier(0.32,0.72,0,1)]",

  // Swiping states
  "data-[swiping]:duration-0 data-[swiping]:select-none",
  "data-[nested-drawer-swiping]:duration-0",

  // Enter/exit animations
  "data-[starting-style]:[transform:translateY(calc(100%-var(--bleed)+2px))]",
  "data-[ending-style]:[transform:translateY(calc(100%-var(--bleed)+2px))]",
  "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]",

  // When a nested drawer is open on top of this one
  "data-[nested-drawer-open]:[height:calc(var(--height)+var(--bleed))]",
  "data-[nested-drawer-open]:overflow-hidden",
  "data-[nested-drawer-open]:after:bg-black/5",

  // Transition
  "[transition:transform_450ms_cubic-bezier(0.32,0.72,0,1),height_450ms_cubic-bezier(0.32,0.72,0,1),box-shadow_450ms_cubic-bezier(0.32,0.72,0,1)]",
)

const popupClasses: Record<DrawerDirection, string> = {
  bottom: nestedBottomPopup,
  top: "w-full max-h-[90vh] rounded-b-lg border-b [transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(-100%)] data-[ending-style]:[transform:translateY(-100%)]",
  right:
    "h-full w-3/4 border-l sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]",
  left: "h-full w-3/4 border-r sm:max-w-lg [transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(-100%)] data-[ending-style]:[transform:translateX(-100%)]",
}

function DrawerContent({
  className,
  children,
  overlay = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  overlay?: boolean
}) {
  const direction = React.useContext(DrawerDirectionContext)
  return (
    <DrawerPortal>
      {overlay && <DrawerOverlay />}
      <DrawerPrimitive.Viewport className={viewportClasses[direction]}>
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          className={cn(
            "bg-background flex flex-col outline-none",
            popupClasses[direction],
            className,
          )}
          {...props}
        >
          {(direction === "top" || direction === "bottom") && (
            <div
              aria-hidden
              className="bg-muted mx-auto my-2 h-1.5 w-12 shrink-0 rounded-full transition-opacity duration-200 group-data-[nested-drawer-open]/popup:opacity-0 group-data-[nested-drawer-swiping]/popup:opacity-100"
            />
          )}
          <DrawerPrimitive.Content className="flex min-h-0 flex-col gap-4 transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] group-data-[nested-drawer-open]/popup:opacity-0 group-data-[nested-drawer-swiping]/popup:opacity-100">
            {children}
          </DrawerPrimitive.Content>
          {/* Spacer to keep content above the bleed zone (-mb-[3rem]) + safe area */}
          {(direction === "top" || direction === "bottom") && (
            <div
              aria-hidden
              className="shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+3rem)]"
            />
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

export { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger }
