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
  trigger: ReactNode;
  disabled?: boolean;
  withSearch?: boolean;
};

export function UsersDialog({
  users,
  title,
  trigger,
  disabled = false,
  withSearch = false,
}: UsersDialogProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (disabled || users.length === 0) {
    return <>{trigger}</>;
  }

  if (withSearch) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-sm p-0">
          <Command className="bg-inherit">
            <CommandInput autoFocus placeholder="Search users..." />
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[400px] flex-col gap-3 overflow-y-auto">
          {users.map((user) => (
            <Link
              key={user.id}
              to="/users/$userId"
              params={{ userId: user.id }}
              onClick={() => setOpen(false)}
              className="hover:bg-accent flex items-center gap-3 rounded-md p-2 transition-colors"
            >
              <Avatar
                className="size-10"
                cloudflareId={user.avatarId}
                alt={user.name}
              >
                <AvatarImage width={40} quality={85} />
                <AvatarFallback name={user.name} />
              </Avatar>
              <span className="text-sm font-medium">{user.name}</span>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
