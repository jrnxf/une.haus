import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { Suspense, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { invariant } from "~/lib/invariant";
import { users } from "~/lib/users";
import { cn } from "~/lib/utils";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

type User = {
  avatarUrl: null | string;
  id: number;
  name: string;
};

export function UserSelector({
  onSelect,
}: {
  onSelect: (user: User | undefined) => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="pointer-events-none w-full cursor-not-allowed">
          <Button
            className="w-full justify-between hover:bg-inherit"
            role="combobox"
            size="lg"
            variant="outline"
          >
            <p className="grow truncate text-left select-none">Select user</p>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </div>
      }
    >
      <UsersCommandGroup onSelect={onSelect} />
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
      <p className="grow truncate">{user.name}</p>
      <Check
        className={cn("mr-2 size-4", showCheck ? "opacity-100" : "opacity-0")}
      />
    </CommandItem>
  );
}

const VIRTUALIZE_THRESHOLD = 7;
function UsersCommandGroup({
  onSelect,
}: {
  onSelect: (user: User | undefined) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<User>();
  const [checkedUser, setCheckedUser] = useState<User>();
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const { data } = useSuspenseQuery(users.all.queryOptions());

  invariant(data[0], "No users found");

  const searchReadyUsers = useMemo(
    () =>
      data.map((user) => ({
        ...user,
        searchKey: user.name.toLowerCase(),
      })),
    [data],
  );

  const lowercasedQuery = query.toLowerCase();

  const fzf = useFzf([
    searchReadyUsers,
    { selector: (user) => user.searchKey },
  ]);

  const filteredUsers = fzf.find(lowercasedQuery);

  const onSelectUser = (user: User) => {
    const nextValue =
      selectedUser && user.id === selectedUser.id ? undefined : user;
    setSelectedUser(nextValue);
    setOpen(false);
    onSelect(nextValue);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between hover:bg-inherit"
          role="combobox"
          size="lg"
          variant="outline"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar
                className="size-5.5 rounded-md"
                // key is necessary because if you select a user with no avatar,
                // it will render the fallback and stay there even if you select a
                // new user that does have an avatar, so the component needs to be
                // reset
                key={selectedUser.id}
              >
                <AvatarImage
                  alt={selectedUser.name}
                  src={selectedUser.avatarUrl}
                />
                <AvatarFallback className="text-xs" name={selectedUser.name} />
              </Avatar>
              <p className="grow truncate text-left">{selectedUser.name}</p>
            </div>
          ) : (
            <p className="grow truncate text-left">Select user</p>
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
        <Command className="w-full" shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Filter..."
            value={query}
          />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>
            {filteredUsers.length > 0 && (
              <CommandGroup>
                <ScrollArea
                  virtualize={filteredUsers.length >= VIRTUALIZE_THRESHOLD}
                  className={cn(
                    // allows the list to shrink when we're not virtualizing
                    filteredUsers.length >= VIRTUALIZE_THRESHOLD
                      ? "h-[250px]"
                      : "max-h-[250px]",
                  )}
                >
                  {filteredUsers.map(({ item: user }) => (
                    <UserItem
                      key={user.id}
                      onSelect={onSelectUser}
                      showCheck={user.id === checkedUser?.id}
                      user={user}
                    />
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
