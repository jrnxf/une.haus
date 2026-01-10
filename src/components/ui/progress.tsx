import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "~/lib/utils";

function Progress({
  className,
  value,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof ProgressPrimitive.Root>>;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "bg-secondary relative h-4 w-full overflow-hidden rounded-full",
        className,
      )}
      ref={ref}
      {...properties}
    >
      <ProgressPrimitive.Indicator
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
