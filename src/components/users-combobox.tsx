import { Link } from "@tanstack/react-router";
import React, { type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { usePeripherals } from "~/hooks/use-peripherals";
import { type UsersWithFollowsData } from "~/lib/users";

export function UsersCombobox({
  users,
  children,
  peripheralKey,
}: {
  users: UsersWithFollowsData["followers"]["users"];
  children: ReactNode;
  peripheralKey: "followers" | "following";
}) {
  const [open, setOpen] = usePeripherals(peripheralKey);

  const isNavigatingRef = React.useRef(false);

  if (users.length === 0) return null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        if (isNavigatingRef.current) {
          // setOpen(false);
          // navigation will cause it to close
          isNavigatingRef.current = false;
        } else {
          setOpen(nextOpen);
        }
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        // modify the 6 below to be the number of users to show before overflow
        className="max-h-[calc((var(--spacing)*8)*6+10px)] w-max"
      >
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            asChild
            onSelect={() => {
              isNavigatingRef.current = true;
            }}
          >
            <Link
              to="/users/$userId"
              params={{ userId: user.id }}
              replace
              className="flex items-center gap-2"
            >
              {/* <Avatar className="size-5">
                <AvatarImage
                  src={user.avatarId}
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs" name={user.name} />
              </Avatar> */}
              <span>{user.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
