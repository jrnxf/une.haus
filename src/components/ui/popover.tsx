import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "~/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    animateClose?: boolean;
  }
>(
  (
    {
      align = "center",
      animateClose = true,
      className,
      sideOffset = 4,
      ...properties
    },
    reference,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          "group/popover-content",
          "w-[var(--radix-popover-trigger-width)]",
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-3 shadow-md outline-hidden",
          animateClose &&
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        ref={reference}
        sideOffset={sideOffset}
        {...properties}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const PopoverAnchor = PopoverPrimitive.Anchor;
export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger };
