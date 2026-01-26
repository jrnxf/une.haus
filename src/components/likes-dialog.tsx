import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

type User = {
  id: number;
  name: string;
  avatarId: string | null;
};

type UsersDialogProps = {
  users: User[];
  title: string;
  trigger?: ReactNode;
  disabled?: boolean;
  withSearch?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UsersDialog({
  users,
  title: _title,
  trigger,
  disabled = false,
  withSearch = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UsersDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen;

  if (disabled || users.length === 0) {
    return <>{trigger}</>;
  }

  if (withSearch) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-sm p-0">
          <Command className="bg-inherit">
            <CommandInput autoFocus placeholder="search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => {
                      setOpen(false);
                      navigate({
                        to: "/users/$userId",
                        params: { userId: user.id },
                      });
                    }}
                  >
                    <span className="text-sm font-medium">{user.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="w-full max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">reactions</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[400px] flex-col gap-1 overflow-y-auto">
          {users.map((user) => (
            <Link
              key={user.id}
              to="/users/$userId"
              params={{ userId: user.id }}
              onClick={() => setOpen(false)}
              className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
            >
              <Avatar
                className="size-6"
                cloudflareId={user.avatarId}
                alt={user.name}
              >
                <AvatarImage width={24} quality={85} />
                <AvatarFallback className="text-xs" name={user.name} />
              </Avatar>
              <span className="text-sm">{user.name}</span>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
