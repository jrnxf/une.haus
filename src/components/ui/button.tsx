import { Slot, Slottable } from "@radix-ui/react-slot";
import { createClientOnlyFn } from "@tanstack/react-start";
import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium cursor-pointer",
    "ring-offset-background",
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ),
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 rounded-md px-3",
        fit: "size-max p-0",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7",
        inherit: "",
        lg: "h-11 px-4 py-2",
        sm: "h-7 rounded-md px-2",
        "sm-default": "h-7 rounded-md px-2 sm:h-9 sm:px-3",
        "sm-icon": "size-5",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",

        // i like the look of ghost using alpha channels most of the time so
        // trying this out
        // ghost: "hover:bg-secondary text-secondary-foreground",
        // "ghost-alpha": "dark:hover:bg-white/10 hover:bg-black/10",
        // ghost: "dark:hover:bg-white/10 hover:bg-black/10",
        ghost: "hover:bg-secondary",

        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border",
        unstyled: "",
      },
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  iconLeft,
  iconRight,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {iconLeft}
      <Slottable>{children}</Slottable>
      {iconRight}
    </Comp>
  );
}

export { Button, buttonVariants };

export const vibrate = createClientOnlyFn(() => {
  if (navigator.vibrate) {
    navigator.vibrate(200);
  } else {
    /*
      iOS fallback: WebKit browsers do not support the Vibration API.
      However, you can trigger a light haptic feedback by associating
      a label to an invisible switch input and toggling it programmatically. 
      */
    const el = document.createElement("div");
    const id = Math.random().toString(36).slice(2);
    el.innerHTML =
      `<input type="checkbox" id="` +
      id +
      `" switch /><label for="` +
      id +
      `"></label>`;
    el.setAttribute(
      "style",
      "display:none !important;opacity:0 !important;visibility:hidden !important;",
    );
    document.querySelector("body")?.append(el);
    el.querySelector("label")?.click();
    setTimeout(function () {
      el.remove();
    }, 1500);
  }
});
