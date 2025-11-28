import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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

export function UsersDropdownMenu({
  users,
  triggerText,
}: UsersDropdownMenuProps) {
  // give priority to users with a location set so the globe has a higher chance of being rendered
  const sortedUsers = users.sort((a) => (a.location ? -1 : 1));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="justify-between" size="sm">
          <span className="truncate">{triggerText}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[200px] w-[200px]">
        {sortedUsers.map((user) => (
          <DropdownMenuItem key={user.id} asChild>
            <Link
              params={{ userId: user.id }}
              to={`/users/$userId`}
              className="flex items-center gap-2"
            >
              <Avatar className="size-5 rounded-lg">
                <AvatarImage alt={user.name} src={user.avatarUrl} />
                <AvatarFallback className="text-xs" name={user.name} />
              </Avatar>
              <span className="truncate">{user.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
