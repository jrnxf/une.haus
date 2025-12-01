"use client";

import { Menu as MenuPrimitive } from "@base-ui-components/react/menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

// Root - Groups all parts of the menu
function Menu({ ...props }: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />;
}

// Trigger - A button that opens the menu
function MenuTrigger({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

// Portal - A portal element that moves the popup to a different part of the DOM
function MenuPortal({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Portal>) {
  return <MenuPrimitive.Portal data-slot="menu-portal" {...props} />;
}

// Backdrop - An overlay displayed beneath the menu popup
function MenuBackdrop({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Backdrop>) {
  return <MenuPrimitive.Backdrop data-slot="menu-backdrop" {...props} />;
}

// Positioner - Positions the menu popup against the trigger
function MenuPositioner({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Positioner>) {
  return (
    <MenuPrimitive.Positioner
      data-slot="menu-positioner"
      className={cn("z-100", className)}
      {...props}
    />
  );
}

function MenuContent({
  className,
  children,
  showBackdrop = false,
  align,
  sideOffset = 4,
  alignOffset = 0,
  side,
  anchor,
  collisionBoundary,
  collisionPadding = 8,
  arrowPadding,
  sticky,
  collisionAvoidance,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & {
  align?: MenuPrimitive.Positioner.Props["align"];
  sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
  alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
  anchor?: MenuPrimitive.Positioner.Props["anchor"];
  side?: MenuPrimitive.Positioner.Props["side"];
  collisionBoundary?: MenuPrimitive.Positioner.Props["collisionBoundary"];
  collisionPadding?: MenuPrimitive.Positioner.Props["collisionPadding"];
  arrowPadding?: MenuPrimitive.Positioner.Props["arrowPadding"];
  sticky?: MenuPrimitive.Positioner.Props["sticky"];
  collisionAvoidance?: MenuPrimitive.Positioner.Props["collisionAvoidance"];
  showBackdrop?: boolean;
}) {
  return (
    <MenuPortal>
      {showBackdrop && <MenuBackdrop />}
      <MenuPositioner
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        side={side}
        anchor={anchor}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        arrowPadding={arrowPadding}
        sticky={sticky}
        collisionAvoidance={collisionAvoidance}
      >
        <MenuPopup
          data-slot="autocomplete-content"
          className={className}
          {...props}
        >
          {children}
        </MenuPopup>
      </MenuPositioner>
    </MenuPortal>
  );
}

// Popup - A container for the menu items
function MenuPopup({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup>) {
  return (
    <MenuPrimitive.Popup
      data-slot="menu-popup"
      {...props}
      className={cn(
        "border-border bg-popover text-popover-foreground z-100 min-w-32 space-y-0.5 overflow-hidden rounded-md border p-2 shadow-md shadow-black/5",
        "origin-(--transform-origin) transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0",
        props.className,
      )}
    />
  );
}

// Arrow - Displays an element positioned against the menu anchor
function MenuArrow({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Arrow>) {
  return <MenuPrimitive.Arrow data-slot="menu-arrow" {...props} />;
}

// Item - An individual interactive item in the menu
function MenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "destructive";
}) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      {...props}
      className={cn(
        "text-foreground relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
        "focus:bg-accent focus:text-foreground",
        "data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground",
        inset && "ps-7",
        variant === "destructive" &&
          "text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/5 focus:bg-destructive/5 data-[active=true]:bg-destructive/5",
        className,
      )}
    />
  );
}

// Separator - A separator element accessible to screen readers
function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      {...props}
      className={cn("bg-muted -mx-2 my-1.5 h-px", className)}
    />
  );
}

// Group - Groups related menu items with the corresponding label
function MenuGroup({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Group>) {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

// GroupLabel - An accessible label that is automatically associated with its parent group
function MenuGroupLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-group-label"
      {...props}
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-xs font-medium",
        inset && "ps-7",
        className,
      )}
    />
  );
}

// RadioGroup - Groups related radio items
function MenuRadioGroup({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioGroup>) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />;
}

// RadioItem - A menu item that works like a radio button in a given group
function MenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      {...props}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-md py-1.5 ps-6 pe-2 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
    >
      <span className="absolute start-1.5 flex h-3.5 w-3.5 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <Circle className="fill-primary stroke-primary h-1.5 w-1.5" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

// RadioItemIndicator - Indicates whether the radio item is selected
function MenuRadioItemIndicator({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItemIndicator>) {
  return (
    <MenuPrimitive.RadioItemIndicator
      data-slot="menu-radio-item-indicator"
      {...props}
    />
  );
}

// CheckboxItem - A menu item that toggles a setting on or off
function MenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menu-checkbox-item"
      checked={checked}
      {...props}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-md py-1.5 ps-7 pe-2 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
    >
      <span className="text-muted-foreground absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <Check className="text-primary h-4 w-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

// CheckboxItemIndicator - Indicates whether the checkbox item is ticked
function MenuCheckboxItemIndicator({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItemIndicator>) {
  return (
    <MenuPrimitive.CheckboxItemIndicator
      data-slot="menu-checkbox-item-indicator"
      {...props}
    />
  );
}

// SubmenuRoot - Groups all parts of a submenu
function MenuSubmenuRoot({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return <MenuPrimitive.SubmenuRoot data-slot="menu-submenu-root" {...props} />;
}

// SubmenuTrigger - A menu item that opens a submenu
function MenuSubmenuTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-submenu-trigger"
      {...props}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none",
        "focus:bg-accent focus:text-foreground",
        "[&[data-popup-open]]:bg-accent [&[data-popup-open]]:text-foreground",
        "[&_svg:not([role=img]):not([class*=text-])]:opacity-60 [&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*=size-])]:size-4",
        inset && "ps-7",
        className,
      )}
    >
      {children}
      <ChevronRight
        data-slot="menu-submenu-trigger-indicator"
        className="ms-auto size-3.5! rtl:rotate-180"
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

// Shortcut - A shortcut display component
function MenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="menu-shortcut"
      {...props}
      className={cn("ms-auto text-xs tracking-widest opacity-60", className)}
    />
  );
}

export {
  Menu,
  MenuContent,
  MenuTrigger,
  MenuPortal,
  MenuBackdrop,
  MenuPositioner,
  MenuPopup,
  MenuArrow,
  MenuItem,
  MenuSeparator,
  MenuGroup,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuCheckboxItem,
  MenuCheckboxItemIndicator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuShortcut,
};
