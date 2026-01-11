import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { createContext, Suspense, useContext, useMemo, useState } from "react";

import { VList } from "virtua";

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
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { invariant } from "~/lib/invariant";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

const api = {
  users: usersApi,
};

type User = {
  avatarId: null | string;
  id: number;
  name: string;
};

export function UserSelector({
  initialSelectedUserId,
  onSelect,
}: {
  initialSelectedUserId: number | undefined;
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
            <p className="grow truncate text-left select-none">Search</p>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </div>
      }
    >
      <UsersCommandDialog
        onSelect={onSelect}
        initialSelectedUserId={initialSelectedUserId}
      />
    </Suspense>
  );
}

const VIRTUALIZE_THRESHOLD = 7;

function UsersCommand(props: {
  onSelect: (user: User | undefined) => void;
  initialSelectedUserId: number | undefined;
}) {
  const {
    query,
    setQuery,
    users: data,
    selectedUser,
    setSelectedUser,
  } = useUserSelector();

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
    props.onSelect(nextValue);
  };

  const usersNode = filteredUsers.map(({ item: user }) => (
    <UserItem key={user.id} onSelect={onSelectUser} user={user} />
  ));

  return (
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
            {filteredUsers.length > VIRTUALIZE_THRESHOLD ? (
              <div className="h-[250px]">
                <VList className="h-[250px] overflow-y-auto">{usersNode}</VList>
              </div>
            ) : (
              usersNode
            )}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

function UserItem({
  onSelect,
  user,
}: {
  onSelect: (user: User) => void;
  user: User;
}) {
  const { selectedUser } = useUserSelector();

  return (
    <CommandItem
      key={user.id}
      keywords={[user.name]}
      onSelect={() => onSelect(user)}
      value={user.id.toString()}
    >
      <p className="grow truncate">{user.name}</p>
      <Check
        className={cn(
          "mr-2 size-4",
          selectedUser?.id === user.id ? "opacity-100" : "opacity-0",
        )}
      />
    </CommandItem>
  );
}

const UserSelectorContext = createContext<{
  query: string;
  setQuery: (query: string) => void;
  selectedUser: User | undefined;
  setSelectedUser: (user: User | undefined) => void;
  users: User[];
}>({
  query: "",
  setQuery: () => {},
  selectedUser: undefined,
  setSelectedUser: () => {},
  users: [],
});

export function useUserSelector() {
  const context = useContext(UserSelectorContext);
  invariant(
    context,
    "useUserSelector must be used within a UserSelectorProvider",
  );
  return context;
}

export function UserSelectorProvider({
  initialSelectedUserId,
  children,
}: {
  initialSelectedUserId: number | undefined;
  children: React.ReactNode;
}) {
  const { data: users } = useSuspenseQuery(api.users.all.queryOptions());

  const initialUser = initialSelectedUserId
    ? users.find((user) => user.id === initialSelectedUserId)
    : undefined;

  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | undefined>(
    initialUser,
  );

  return (
    <UserSelectorContext.Provider
      value={{
        query,
        setQuery,
        selectedUser,
        setSelectedUser,
        users,
      }}
    >
      {children}
    </UserSelectorContext.Provider>
  );
}

const withUserSelector = <
  T extends { initialSelectedUserId: number | undefined },
>(
  Component: React.ComponentType<T>,
) => {
  return ({ initialSelectedUserId, ...props }: T) => {
    return (
      <UserSelectorProvider initialSelectedUserId={initialSelectedUserId}>
        <Component {...(props as T)} />
      </UserSelectorProvider>
    );
  };
};

const UsersCommandDialog = withUserSelector<{
  onSelect: (user: User | undefined) => void;
  initialSelectedUserId: number | undefined;
}>((props) => {
  const { selectedUser, setQuery } = useUserSelector();

  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
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
                cloudflareId={selectedUser.avatarId}
                alt={selectedUser.name}
                // key is necessary because if you select a user with no avatar,
                // it will render the fallback and stay there even if you select a
                // new user that does have an avatar, so the component needs to be
                // reset
                key={selectedUser.id}
              >
                <AvatarImage width={22} quality={85} />
                <AvatarFallback className="text-xs" name={selectedUser.name} />
              </Avatar>
              <p className="grow truncate text-left">{selectedUser.name}</p>
            </div>
          ) : (
            <p className="grow truncate text-left">Search</p>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-full p-0"
        showCloseButton={false}
        onCloseAutoFocus={() => {
          setQuery("");
        }}
      >
        <UsersCommand
          {...props}
          onSelect={(args) => {
            props.onSelect(args);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
});
