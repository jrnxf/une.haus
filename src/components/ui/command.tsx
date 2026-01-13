import { CommandIcon, Loader2Icon, SearchIcon } from "lucide-react";
import * as React from "react";
import { createContext, useContext } from "react";

import { Command as CommandPrimitive } from "cmdk";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

const CommandLoading = CommandPrimitive.Loading;

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        // flips the command input and list if the popover is on top - means the input is always close to the trigger
        "group-data-[side=top]/popover-content:flex-col-reverse",
        className,
      )}
      {...props}
      loop
    />
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  onCloseAutoFocus,
  showCloseButton = true,
  footer,
  onValueChange,
  value,
  shouldFilter = true,
  ...props
}: React.ComponentProps<typeof Dialog> &
  Pick<React.ComponentProps<typeof DialogContent>, "onCloseAutoFocus"> & {
    title?: string;
    description?: string;
    className?: string;
    showCloseButton?: boolean;
    footer?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
    shouldFilter?: boolean;
  }) {
  return (
    <Dialog {...props}>
      <DialogTrigger asChild>
        <Button
          aria-label="Open command menu"
          className={cn("size-7", className)}
          size="icon"
          variant="ghost"
        >
          <CommandIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[min(400px,calc(100vh-100px))] flex-col gap-0 overflow-hidden p-0",
          className,
        )}
        showCloseButton={showCloseButton}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command
          value={value}
          onValueChange={onValueChange}
          shouldFilter={shouldFilter}
          className="**:[[cmdk-group-heading]]:text-muted-foreground min-h-0 flex-1 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:min-h-12 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group]]:px-2"
        >
          {children}
        </Command>
        {footer}
      </DialogContent>
    </Dialog>
  );
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="text-muted-foreground py-3 text-center text-sm"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground overflow-hidden p-1",
        "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className,
      )}
      {...props}
    />
  );
}

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    isFetching?: boolean;
  }
>(({ className, isFetching, ...props }, ref) => {
  return (
    <div
      className={cn(
        "flex h-9 min-h-9 items-center gap-2 px-3",
        "border-b",
        "group-data-[side=top]/popover-content:border-t group-data-[side=top]/popover-content:border-b-0",
      )}
      data-slot="command-input-wrapper"
    >
      {isFetching ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin opacity-50" />
      ) : (
        <SearchIcon className="size-4 shrink-0 opacity-50" />
      )}
      <CommandPrimitive.Input
        ref={ref}
        data-slot="command-input"
        className={cn(
          "placeholder:text-muted-foreground h-full w-full bg-transparent outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = "CommandInput";

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm p-2 outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

const CommandList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    data-slot="command-list"
    className={cn(
      "max-h-full min-h-0 grow scroll-py-1 overflow-x-hidden overflow-y-auto",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = "CommandList";

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

// Action system types
type CommandAction = {
  id: string;
  label: string;
  shortcut?: {
    key: string;
    meta?: boolean;
    shift?: boolean;
    ctrl?: boolean;
  };
  onAction: () => void;
};

type CommandActionsContextValue = {
  actions: CommandAction[];
  setActions: (actions: CommandAction[]) => void;
};

const CommandActionsContext = createContext<CommandActionsContextValue | null>(
  null,
);

function useCommandActions() {
  const context = useContext(CommandActionsContext);
  if (!context) {
    throw new Error(
      "useCommandActions must be used within CommandActionsProvider",
    );
  }
  return context;
}

function CommandActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = React.useState<CommandAction[]>([]);

  return (
    <CommandActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </CommandActionsContext.Provider>
  );
}

function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

function CommandFooter({ className }: { className?: string }) {
  const { actions } = useCommandActions();

  if (actions.length === 0) return null;

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.userAgent);
  const metaKey = isMac ? "⌘" : "Ctrl";

  const formatShortcut = (shortcut: CommandAction["shortcut"]) => {
    if (!shortcut) return null;
    const parts: string[] = [];
    if (shortcut.meta) parts.push(metaKey);
    if (shortcut.ctrl) parts.push("Ctrl");
    if (shortcut.shift) parts.push("⇧");
    parts.push(shortcut.key.toUpperCase());
    return parts;
  };

  return (
    <div
      data-slot="command-footer"
      className={cn(
        "bg-background flex items-center justify-end gap-3 border-t px-3 py-2",
        className,
      )}
    >
      {actions.map((action, index) => {
        const shortcutParts = formatShortcut(action.shortcut);
        const isPrimary = index === 0;

        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onAction}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              isPrimary
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{action.label}</span>
            {shortcutParts && (
              <span className="flex items-center gap-0.5">
                {shortcutParts.map((part, i) => (
                  <Kbd key={i}>{part}</Kbd>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export {
  Command,
  CommandActionsProvider,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
  CommandShortcut,
  Kbd,
  useCommandActions,
};
export type { CommandAction };
