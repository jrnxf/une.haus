import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({
  className,
  ...properties
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/30 duration-300",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...properties}
    />
  );
}
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  cn(
    // z-[51] instead of z-50 to prevent overlay from covering content during rapid toggles
    // (fixes race condition where animation states can desync)
    "fixed z-[51] gap-4 bg-background p-6 shadow-lg transition ease-in-out duration-300",
    "data-[state=open]:animate-in",
    "data-[state=closed]:animate-out",
  ),
  {
    defaultVariants: {
      side: "right",
    },
    variants: {
      side: {
        bottom: cn(
          "inset-x-0 bottom-0 border-t",
          "data-[state=open]:slide-in-from-bottom",
          "data-[state=closed]:slide-out-to-bottom",
        ),
        left: cn(
          "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          "data-[state=open]:slide-in-from-left",
          "data-[state=closed]:slide-out-to-left",
        ),
        right: cn(
          "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          "data-[state=open]:slide-in-from-right",
          "data-[state=closed]:slide-out-to-right",
        ),
        top: cn(
          "inset-x-0 top-0 border-b",
          "data-[state=open]:slide-in-from-top",
          "data-[state=closed]:slide-out-to-top",
        ),
      },
    },
  },
);

type SheetContentProperties = React.ComponentPropsWithoutRef<
  typeof SheetPrimitive.Content
> &
  VariantProps<typeof sheetVariants>;

function SheetContent({
  children,
  className,
  side = "right",
  ...properties
}: SheetContentProperties) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...properties}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            "absolute top-4 right-4 rounded-xs opacity-70 transition-opacity",
            "disabled:pointer-events-none",
            "hover:opacity-100",
            "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
            "ring-offset-background",
            "data-[state=open]:bg-secondary",
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}
SheetContent.displayName = SheetPrimitive.Content.displayName;

function SheetHeader({
  className,
  ...properties
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center",
        "sm:text-left",
        className,
      )}
      {...properties}
    />
  );
}
SheetHeader.displayName = "SheetHeader";

function SheetFooter({
  className,
  ...properties
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse",
        "sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...properties}
    />
  );
}
SheetFooter.displayName = "SheetFooter";

function SheetTitle({
  className,
  ...properties
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn("text-foreground text-lg font-semibold", className)}
      {...properties}
    />
  );
}
SheetTitle.displayName = SheetPrimitive.Title.displayName;

function SheetDescription({
  className,
  ...properties
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...properties}
    />
  );
}
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
