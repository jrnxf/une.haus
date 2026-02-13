import * as React from "react";

import { cn } from "~/lib/utils";

/**
 * Lightweight Slot component that replaces @radix-ui/react-slot.
 * Renders the child element with merged props from the parent.
 */
const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, ...props }, forwardedRef) => {
    const child = React.Children.only(children);
    if (!React.isValidElement(child)) return null;

    const childProps = child.props as Record<string, unknown>;

    return React.cloneElement(child, {
      ...props,
      ...childProps,
      ref: forwardedRef,
      className: cn(
        props.className as string | undefined,
        childProps.className as string | undefined,
      ),
      style: {
        ...(props.style ?? {}),
        ...((childProps.style as React.CSSProperties) ?? {}),
      },
      // Merge event handlers
      ...(props.onClick && childProps.onClick
        ? {
            onClick: (e: React.MouseEvent) => {
              (childProps.onClick as (e: React.MouseEvent) => void)?.(e);
              (props.onClick as (e: React.MouseEvent) => void)?.(e);
            },
          }
        : {}),
    } as React.Attributes);
  },
);

Slot.displayName = "Slot";

export { Slot };
