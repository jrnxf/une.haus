import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useIsMobile } from "~/hooks/use-mobile";

type User = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

type UsersPopoverProps = {
  users: User[];
  title: string;
  trigger: ReactNode;
  disabled?: boolean;
};

export function UsersPopover({
  users,
  title,
  trigger,
  disabled = false,
}: UsersPopoverProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (disabled || users.length === 0) {
    return <>{trigger}</>;
  }

  const userList = (
    <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
      {users.map((user) => (
        <Link
          key={user.id}
          to="/users/$userId"
          params={{ userId: user.id }}
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent transition-colors"
        >
          <Avatar className="size-7">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback name={user.name} />
          </Avatar>
          <span className="text-xs font-medium">{user.name}</span>
        </Link>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="p-4">
          <DrawerTitle className="text-sm">{title}</DrawerTitle>
          {userList}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-xs">
        <DropdownMenuLabel className="text-sm">{title}</DropdownMenuLabel>
        {userList}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

