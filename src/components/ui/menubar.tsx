import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

function Menubar({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.Root>>;
}) {
  return (
    <MenubarPrimitive.Root
      className={cn(
        "bg-background flex h-10 items-center space-x-1 rounded-md border p-1",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
Menubar.displayName = MenubarPrimitive.Root.displayName;

function MenubarTrigger({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.Trigger>>;
}) {
  return (
    <MenubarPrimitive.Trigger
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-xs px-3 py-1.5 text-sm font-medium outline-hidden select-none",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

function MenubarSubTrigger({
  children,
  className,
  inset,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.SubTrigger>>;
}) {
  return (
    <MenubarPrimitive.SubTrigger
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-xs px-2 py-1.5 text-sm outline-hidden select-none",
        inset && "pl-8",
        className,
      )}
      ref={ref}
      {...properties}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubTrigger>
  );
}
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

function MenubarSubContent({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.SubContent>>;
}) {
  return (
    <MenubarPrimitive.SubContent
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

function MenubarContent({
  align = "start",
  alignOffset = -4,
  className,
  sideOffset = 8,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.Content>>;
}) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md",
          className,
        )}
        ref={ref}
        sideOffset={sideOffset}
        {...properties}
      />
    </MenubarPrimitive.Portal>
  );
}
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

function MenubarItem({
  className,
  inset,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.Item>>;
}) {
  return (
    <MenubarPrimitive.Item
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-xs px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        inset && "pl-8",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

function MenubarCheckboxItem({
  checked,
  children,
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.CheckboxItem>>;
}) {
  return (
    <MenubarPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...properties}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

function MenubarRadioItem({
  children,
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.RadioItem>>;
}) {
  return (
    <MenubarPrimitive.RadioItem
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...properties}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

function MenubarLabel({
  className,
  inset,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.Label>>;
}) {
  return (
    <MenubarPrimitive.Label
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
        inset && "pl-8",
        className,
      )}
      ref={ref}
      {...properties}
    />
  );
}
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

function MenubarSeparator({
  className,
  ref,
  ...properties
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator> & {
  ref?: React.Ref<React.ElementRef<typeof MenubarPrimitive.Separator>>;
}) {
  return (
    <MenubarPrimitive.Separator
      className={cn("bg-muted -mx-1 my-1 h-px", className)}
      ref={ref}
      {...properties}
    />
  );
}
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({
  className,
  ...properties
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...properties}
    />
  );
};
MenubarShortcut.displayname = "MenubarShortcut";

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
