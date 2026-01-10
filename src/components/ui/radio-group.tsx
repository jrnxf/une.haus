import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

function RadioGroup({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof RadioGroupPrimitive.Root>>;
}) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...properties}
      ref={ref}
    />
  );
}
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

function RadioGroupItem({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
  ref?: React.Ref<React.ElementRef<typeof RadioGroupPrimitive.Item>>;
}) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...properties}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
