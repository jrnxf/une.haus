import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
  avatarUrl: string | null;
};

type UsersDialogProps = {
  users: User[];
  title: string;
  trigger: ReactNode;
  disabled?: boolean;
};

export function UsersDialog({
  users,
  title,
  trigger,
  disabled = false,
}: UsersDialogProps) {
  const [open, setOpen] = useState(false);

  if (disabled || users.length === 0) {
    return <>{trigger}</>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
          {users.map((user) => (
            <Link
              key={user.id}
              to="/users/$userId"
              params={{ userId: user.id }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
            >
              <Avatar className="size-10">
                <AvatarImage src={user.avatarUrl} />
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

