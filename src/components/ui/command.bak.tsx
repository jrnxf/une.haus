import { Loader2Icon, SearchIcon } from "lucide-react";
import * as React from "react";

import { Command as CommandPrimitive } from "cmdk";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

const CommandLoading = CommandPrimitive.Loading;

function Command({
  className,
  ...properties
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className,
      )}
      data-slot="command"
      loop
      {...properties}
    />
  );
}

function CommandDialog({
  children,
  description = "Search for a command to run...",
  onCloseAutoFocus,
  title = "Command Palette",
  ...properties
}: Pick<React.ComponentProps<typeof DialogContent>, "onCloseAutoFocus"> &
  React.ComponentProps<typeof Dialog> & {
    description?: string;
    title?: string;
  }) {
  return (
    <Dialog {...properties}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="overflow-hidden p-0"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <Command>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandEmpty({
  ...properties
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className="py-6 text-center text-sm"
      data-slot="command-empty"
      {...properties}
    />
  );
}

function CommandGroup({
  className,
  ...properties
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "text-foreground overflow-hidden p-1",
        "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className,
      )}
      data-slot="command-group"
      {...properties}
    />
  );
}

function CommandInput({
  className,
  isFetching,
  ...properties
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  isFetching?: boolean;
}) {
  return (
    <div
      className="flex h-9 items-center gap-2 px-3"
      data-slot="command-input-wrapper"
    >
      {isFetching ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin opacity-50" />
      ) : (
        <SearchIcon className="size-4 shrink-0 opacity-50" />
      )}
      <CommandPrimitive.Input
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        data-slot="command-input"
        {...properties}
      />
    </div>
  );
}

function CommandItem({
  className,
  ...properties
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      data-slot="command-item"
      {...properties}
    />
  );
}

function CommandList({
  className,
  ...properties
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className,
      )}
      data-slot="command-list"
      {...properties}
    />
  );
}

function CommandSeparator({
  className,
  ...properties
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("bg-border -mx-1 h-px", className)}
      data-slot="command-separator"
      {...properties}
    />
  );
}

function CommandShortcut({
  className,
  ...properties
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      data-slot="command-shortcut"
      {...properties}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
  CommandShortcut,
};
