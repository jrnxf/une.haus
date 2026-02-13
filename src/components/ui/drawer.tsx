import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import * as React from "react";

import { cn } from "~/lib/utils";

type DrawerDirection = "top" | "bottom" | "left" | "right";

const DrawerDirectionContext = React.createContext<DrawerDirection>("bottom");

const directionToSwipeDirection = {
  top: "up",
  bottom: "down",
  left: "left",
  right: "right",
} as const;

function Drawer({
  direction = "bottom",
  ...props
}: Omit<DrawerPrimitive.Root.Props, "swipeDirection"> & {
  direction?: DrawerDirection;
}) {
  return (
    <DrawerDirectionContext.Provider value={direction}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        swipeDirection={directionToSwipeDirection[direction]}
        {...props}
      />
    </DrawerDirectionContext.Provider>
  );
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
      : render;
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children;
  return (
    <DrawerPrimitive.Trigger
      data-slot="drawer-trigger"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </DrawerPrimitive.Trigger>
  );
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
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
      : render;
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children;
  return (
    <DrawerPrimitive.Close
      data-slot="drawer-close"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </DrawerPrimitive.Close>
  );
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
  );
}

const viewportClasses: Record<DrawerDirection, string> = {
  bottom: "fixed inset-0 z-50 flex items-end",
  top: "fixed inset-0 z-50 flex items-start",
  right: "fixed inset-0 z-50 flex items-stretch justify-end",
  left: "fixed inset-0 z-50 flex items-stretch justify-start",
};

const popupClasses: Record<DrawerDirection, string> = {
  bottom:
    "w-full max-h-[90vh] rounded-t-lg border-t [transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(100%)] data-[ending-style]:[transform:translateY(100%)]",
  top: "w-full max-h-[90vh] rounded-b-lg border-b [transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(-100%)] data-[ending-style]:[transform:translateY(-100%)]",
  right:
    "h-full w-3/4 border-l sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]",
  left: "h-full w-3/4 border-r sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(-100%)] data-[ending-style]:[transform:translateX(-100%)]",
};

function DrawerContent({
  className,
  children,
  overlay = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  overlay?: boolean;
}) {
  const direction = React.useContext(DrawerDirectionContext);
  return (
    <DrawerPortal>
      {overlay && <DrawerOverlay />}
      <DrawerPrimitive.Viewport className={viewportClasses[direction]}>
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          className={cn(
            "bg-background flex h-auto flex-col transition-transform duration-200 ease-in-out outline-none data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
            popupClasses[direction],
            className,
          )}
          {...props}
        >
          <div
            aria-hidden
            className="bg-muted mx-auto my-4 h-1.5 w-12 rounded-full"
          />
          <DrawerPrimitive.Content>{children}</DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 text-center md:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
