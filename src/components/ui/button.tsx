import { Slot, Slottable } from "@radix-ui/react-slot";
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

        // i like the look ofghost using alpha channels most of the time so
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

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
  };

/**
 *  Slottable is necessary since there can be multiple children of Comp (which
 * can be a Slot if asChild is provided). The props passed to Comp will actually
 * end up on whatever html element "children" represents. In the following
 * example, in would be the "a" element. Not it must be a JSX element and not
 * simply a string that is the first child
 * @example
 * ```jsx
 * <Button asChild iconLeft={<Loader2Icon />}>
 *   <a href="/">hello</a>
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      children,
      className,
      iconLeft,
      iconRight,
      size,
      variant,
      ...properties
    },
    reference,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ className, size, variant }))}
        ref={reference}
        {...properties}
      >
        {iconLeft}
        <Slottable>{children}</Slottable>
        {iconRight}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
