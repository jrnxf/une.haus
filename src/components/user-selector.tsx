import { Check, ChevronsUpDown } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { invariant } from "~/lib/invariant";
import { VList } from "virtua";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type User = {
  avatarUrl: null | string;
  id: number;
  name: string;
};

export function UserSelector({
  onUpdate,
}: {
  onUpdate: (user: undefined | User) => void;
}) {
  return (
    <Suspense
      fallback={
        <Button
          className="w-64 justify-between hover:bg-inherit"
          disabled
          role="combobox"
          size="lg"
          variant="outline"
        >
          Select user...
        </Button>
      }
    >
      <UsersCommandGroup onUpdate={onUpdate} />
    </Suspense>
  );
}

function UserItem({
  onSelect,
  showCheck,
  user,
}: {
  onSelect: (user: User) => void;
  showCheck: boolean;
  user: User;
}) {
  return (
    <CommandItem
      key={user.id}
      keywords={[user.name]}
      onSelect={() => onSelect(user)}
      value={user.id.toString()}
    >
      <Avatar className="size-6 rounded-lg">
        <AvatarImage
          alt={user.name}
          height={28}
          quality={70}
          src={user.avatarUrl}
          width={28}
        />
        <AvatarFallback className="text-xs" name={user.name} />
      </Avatar>
      <p className="grow truncate text-sm">{user.name}</p>
      <Check
        className={cn("mr-2 size-4", showCheck ? "opacity-100" : "opacity-0")}
      />
    </CommandItem>
  );
}

function UsersCommandGroup({ onUpdate }: { onUpdate: (user: User) => void }) {
  const [selectedUser, setSelectedUser] = useState<User>();
  const [checkedUser, setCheckedUser] = useState<User>();
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [users] = api.user.all.useSuspenseQuery();

  invariant(users[0], "No users found");

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [users, query]);

  const noResults = filteredUsers.length === 0;

  const onSelect = (user: User) => {
    setSelectedUser(user);
    setOpen(false);
    onUpdate(user);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-64 justify-between hover:bg-inherit"
          role="combobox"
          size="lg"
          variant="outline"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar
                className="size-5.5 rounded-lg"
                // key is necessary because if you select a user with no avatar,
                // it will render the fallback and stay there even if you select a
                // new user that does have an avatar, so the component needs to be
                // reset
                key={selectedUser.id}
              >
                <AvatarImage
                  alt={selectedUser.name}
                  height={28}
                  quality={70}
                  src={selectedUser.avatarUrl}
                  width={28}
                />
                <AvatarFallback className="text-xs" name={selectedUser.name} />
              </Avatar>
              <p className="grow truncate text-left">{selectedUser.name}</p>
            </div>
          ) : (
            <p className="grow truncate text-left">Select user...</p>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-full p-0"
        onCloseAutoFocus={() => {
          if (selectedUser) {
            setCheckedUser(selectedUser);
          }
          setQuery("");
        }}
      >
        <Command className="w-64" shouldFilter={false}>
          <CommandInput
            autoFocus
            onValueChange={setQuery}
            placeholder="Search users..."
            value={query}
          />
          <Separator />
          {noResults && (
            <p className="border-t py-4 text-center text-sm">No user found.</p>
          )}
          <CommandGroup>
            <CommandList>
              {filteredUsers.length < 20 ? (
                filteredUsers.map((user) => (
                  <UserItem
                    key={user.id}
                    onSelect={onSelect}
                    showCheck={user.id === checkedUser?.id}
                    user={user}
                  />
                ))
              ) : (
                <VList style={{ height: 300 }}>
                  {filteredUsers.map((user) => (
                    <UserItem
                      key={user.id}
                      onSelect={onSelect}
                      showCheck={user.id === checkedUser?.id}
                      user={user}
                    />
                  ))}
                </VList>
              )}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
