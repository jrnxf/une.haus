import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import * as React from "react"

import { buttonVariants } from "~/components/ui/base-button"
import { buttonVariants as uiButtonVariants } from "~/components/ui/button"
import { useHaptics } from "~/lib/haptics"
import { cn } from "~/lib/utils"

// Base UI Alert Dialog Backdrop
function AlertDialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Backdrop>) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 [backdrop-filter:blur(4px)] transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

// Base UI Alert Dialog Portal
function AlertDialogPortal(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>,
) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

// Base UI Alert Dialog Popup
function AlertDialogPopup({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Popup>) {
  return (
    <AlertDialogPrimitive.Popup
      data-slot="alert-dialog-popup"
      className={cn(
        "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg shadow-black/5 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 sm:rounded-lg",
        className,
      )}
      {...props}
    />
  )
}

// Alert Dialog Footer (helper component)
const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="alert-dialog-footer"
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2.5",
      className,
    )}
    {...props}
  />
)

// Base UI Alert Dialog Title
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "flex items-center gap-2.5 text-lg font-semibold",
        className,
      )}
      {...props}
    />
  )
}

// Base UI Alert Dialog Description
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

// Reusable Confirmation Dialog Component
export type ConfirmDialogConfig = {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  onCancel?: () => void
}

type ConfirmDialogProps = ConfirmDialogConfig & {
  handle: React.ComponentProps<typeof AlertDialogPrimitive.Root>["handle"]
}

function ConfirmDialog({
  handle,
  title,
  description,
  confirmText = "confirm",
  cancelText = "cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const haptics = useHaptics()
  const isConfirmingRef = React.useRef(false)
  return (
    <AlertDialogPrimitive.Root
      handle={handle}
      onOpenChange={(open) => {
        if (!open) {
          if (!isConfirmingRef.current) {
            onCancel?.()
          }
          isConfirmingRef.current = false
        }
      }}
    >
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
          <AlertDialogFooter>
            <AlertDialogPrimitive.Close
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {cancelText}
            </AlertDialogPrimitive.Close>
            <AlertDialogPrimitive.Close
              className={cn(
                variant === "destructive"
                  ? uiButtonVariants({ variant: "destructive" })
                  : buttonVariants({ variant: "primary" }),
              )}
              onClick={() => {
                isConfirmingRef.current = true
                if (variant === "destructive") haptics.warning()
                onConfirm()
              }}
            >
              {confirmText}
            </AlertDialogPrimitive.Close>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialogPrimitive.Root>
  )
}

// Exports with proper naming to match Base UI pattern
export { ConfirmDialog }
