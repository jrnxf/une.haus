"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import * as React from "react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  asChild,
  children,
  render,
  ...props
}: DialogPrimitive.Trigger.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-overlay"
      className={cn(
        "pointer-events-none absolute inset-0 isolate",
        "group-data-[open]/dialog-viewport:animate-in",
        "group-data-[closed]/dialog-viewport:animate-out",
        "group-data-[closed]/dialog-viewport:fade-out-0",
        "group-data-[open]/dialog-viewport:fade-in-0",
        "bg-black/10 duration-100",
        "group-data-[starting-style]/dialog-viewport:opacity-0",
        "group-data-[ending-style]/dialog-viewport:opacity-0",
        "supports-backdrop-filter:backdrop-blur-xs",
        "group-data-[closed]/dialog-viewport:[backdrop-filter:none]",
        "group-data-[ending-style]/dialog-viewport:[backdrop-filter:none]",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlay = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  overlay?: boolean
}) {
  return (
    <DialogPortal>
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        className="group/dialog-viewport fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh] sm:p-6 sm:pt-[15vh]"
      >
        {overlay && <DialogOverlay />}
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "bg-background",
            "data-closed:animate-out data-open:animate-in",
            "data-closed:fade-out-0 data-open:fade-in-0",
            "data-closed:zoom-out-95 data-open:zoom-in-95",
            "relative z-10 grid max-h-[85vh] w-full max-w-[calc(100%-2rem)] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg",
            "duration-200 sm:max-w-lg",
            className,
          )}
          {...props}
        >
          {children}

          {showCloseButton && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <DialogClose render={<Button size="icon-sm" variant="ghost" />}>
                <XIcon className="size-3.5" />
                <span className="sr-only">close</span>
              </DialogClose>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
