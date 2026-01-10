import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

function Checkbox({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof CheckboxPrimitive.Root>>;
}) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer border-primary ring-offset-background focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-4 w-4 shrink-0 rounded-xs border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...properties}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
