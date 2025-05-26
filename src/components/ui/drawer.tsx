import * as React from "react";
import FocusLock from "react-focus-lock";

import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "~/lib/utils";

const Drawer = (props: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground {...props} />
);

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...properties }, reference) => (
  <DrawerPrimitive.Overlay
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    ref={reference}
    {...properties}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    iconButtonSlot?: React.ReactNode;
    overlay?: boolean;
  }
>(
  (
    { children, className, iconButtonSlot, overlay = true, ...properties },
    reference,
  ) => (
    <DrawerPortal>
      {overlay && <DrawerOverlay />}
      <DrawerPrimitive.Content
        className={cn(
          "bg-background fixed inset-x-0 bottom-0 z-50 mx-auto mt-24 flex h-auto max-w-[98dvw] flex-col rounded-t-[10px] border",
          className,
        )}
        ref={reference}
        {...properties}
      >
        <div className="bg-muted mx-auto mt-4 h-2 w-[100px] rounded-full" />
        <FocusLock className="flex grow flex-col gap-4" returnFocus={true}>
          {iconButtonSlot && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {iconButtonSlot}
            </div>
          )}
          {children}
        </FocusLock>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  ),
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...properties
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...properties}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...properties
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...properties}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...properties }, reference) => (
  <DrawerPrimitive.Title
    className={cn(
      "text-lg leading-none font-semibold tracking-tight",
      className,
    )}
    ref={reference}
    {...properties}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...properties }, reference) => (
  <DrawerPrimitive.Description
    className={cn("text-muted-foreground text-sm", className)}
    ref={reference}
    {...properties}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

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
