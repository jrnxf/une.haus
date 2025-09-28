import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

type User = {
  avatarUrl: string | null;
  id: number;
  name: string;
  location: {
    lat: number;
    lng: number;
  } | null;
};
type UsersDropdownMenuProps = {
  users: User[];
  triggerText: string;
};

const VIRTUALIZE_THRESHOLD = 6;

export function UsersDropdownMenu({
  users,
  triggerText,
}: UsersDropdownMenuProps) {
  const [open, setOpen] = useState(false);

  // give priority to users with a location set so the globe has a higher chance of being rendered
  const sortedUsers = users.sort((a) => (a.location ? -1 : 1));

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="justify-between" size="sm">
          <span className="truncate">{triggerText}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[200px] p-0">
        <Command className="w-full">
          <CommandList>
            <CommandGroup>
              <ScrollArea
                virtualize={sortedUsers.length >= VIRTUALIZE_THRESHOLD}
                className={cn(
                  sortedUsers.length >= VIRTUALIZE_THRESHOLD
                    ? "h-[200px]"
                    : "max-h-[200px]",
                )}
              >
                {sortedUsers.map((user) => (
                  <CommandItem key={user.id} asChild>
                    <Link
                      params={{ userId: user.id }}
                      to={`/users/$userId`}
                      className="flex items-center gap-2"
                      onClick={() => setOpen(false)}
                    >
                      <Avatar className="size-5 rounded-lg">
                        <AvatarImage alt={user.name} src={user.avatarUrl} />
                        <AvatarFallback className="text-xs" name={user.name} />
                      </Avatar>
                      <span className="truncate">{user.name}</span>
                    </Link>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
