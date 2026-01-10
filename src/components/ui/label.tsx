import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const labelVariants = cva(
  "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

function Label({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants> & {
    ref?: React.Ref<React.ElementRef<typeof LabelPrimitive.Root>>;
  }) {
  return (
    <LabelPrimitive.Root
      className={cn(labelVariants(), className)}
      ref={ref}
      {...properties}
    />
  );
}
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
