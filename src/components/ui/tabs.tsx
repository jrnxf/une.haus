import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "~/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.List>>;
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-10 items-center justify-center rounded-md p-1",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
TabsList.displayName = TabsPrimitive.List.displayName;

function TabsTrigger({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.Trigger>>;
}) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-xs px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-xs",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

function TabsContent({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.Content>>;
}) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
