import * as React from "react";

import { cn } from "~/lib/utils";

function Textarea({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value"> & {
  value?: string | null;
}) {
  return (
    <textarea
      className={cn(
        "border-input bg-background ring-offset-background flex min-h-[80px] w-full rounded-md border px-3 py-2",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      rows={7}
      value={value ?? undefined}
      {...props}
    />
  );
}

export { Textarea };
