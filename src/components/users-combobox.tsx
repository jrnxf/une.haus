import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useIsMobile } from "~/hooks/use-mobile";
import { usePeripherals } from "~/hooks/use-peripherals";
import { type UsersWithFollowsData } from "~/lib/users";

type User = UsersWithFollowsData["followers"]["users"][number];

function UsersCommandContent({
  users,
  label,
}: {
  users: User[];
  label: string;
}) {
  const navigate = useNavigate();

  return (
    <Command>
      <CommandInput placeholder={`Search ${label}...`} />
      <CommandList>
        <CommandEmpty>No users found.</CommandEmpty>
        <CommandGroup>
          {users.map((user) => (
            <CommandItem
              key={user.id}
              value={user.name}
              onSelect={() => {
                navigate({
                  to: "/users/$userId",
                  params: { userId: user.id },
                  replace: true,
                });
              }}
              asChild
            >
              <Link
                to="/users/$userId"
                params={{ userId: user.id }}
                replace
                className="flex items-center gap-2"
              >
                <Avatar className="size-6">
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xs" name={user.name} />
                </Avatar>
                <span>{user.name}</span>
              </Link>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function UsersCombobox({
  users,
  label,
  children,
  id,
}: {
  users: UsersWithFollowsData["followers"]["users"];
  label: string;
  children: ReactNode;
  id: string;
}) {
  const [open, setOpen] = usePeripherals(id);
  const isMobile = useIsMobile();

  if (users.length === 0) return null;

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="p-0" showCloseButton={false}>
          <UsersCommandContent
            users={users}
            label={label}
            onSelect={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-0" align="center">
        <UsersCommandContent
          users={users}
          label={label}
          onSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
