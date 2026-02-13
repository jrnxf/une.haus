import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({
  asChild,
  children,
  render,
  ...props
}: CollapsiblePrimitive.Root.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render;
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children;
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </CollapsiblePrimitive.Root>
  )
}

function CollapsibleTrigger({
  asChild,
  children,
  render,
  ...props
}: CollapsiblePrimitive.Trigger.Props & { asChild?: boolean }) {
  const resolvedRender =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement)
      : render;
  const resolvedChildren =
    asChild && React.isValidElement(children) ? undefined : children;
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      render={resolvedRender}
      {...props}
    >
      {resolvedChildren}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
