import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { type ResolvedRiderEntry } from "~/lib/events/bracket";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

export type RiderEntry = ResolvedRiderEntry;

type User = {
  id: number;
  name: string;
  avatarId: string | null;
};

export function SingleRiderSelector({
  value,
  onChange,
  placeholder = "Search users or add a custom name...",
}: {
  value: RiderEntry | null;
  onChange: (rider: RiderEntry | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useQuery(usersApi.all.queryOptions());

  const searchReadyUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        searchKey: user.name.toLowerCase(),
      })),
    [users],
  );

  const fzf = useFzf([
    searchReadyUsers,
    { selector: (user) => user.searchKey },
  ]);
  const filteredUsers = query ? fzf.find(query.toLowerCase()) : [];

  // Get user data for selected rider
  const selectedUser = useMemo(() => {
    if (!value?.userId) return null;
    return users.find((u) => u.id === value.userId) ?? null;
  }, [value, users]);

  const handleSelectUser = (user: User) => {
    onChange({ userId: user.id, name: user.name });
    setQuery("");
  };

  const handleAddCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    // Check if it matches an existing user exactly - select them instead
    const exactMatch = users.find(
      (u) => u.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exactMatch) {
      onChange({ userId: exactMatch.id, name: exactMatch.name });
    } else {
      onChange({ userId: null, name: trimmed });
    }
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    inputRef.current?.focus();
  };

  const trimmedQuery = query.trim();
  const showAddCustom = trimmedQuery.length > 0;
  const hasDropdownItems = query && (filteredUsers.length > 0 || showAddCustom);
  const displayName = selectedUser?.name ?? value?.name ?? null;

  return (
    <div className="space-y-2">
      {!displayName && (
        <div className="relative">
          <Command
            className={cn(
              "overflow-visible border",
              hasDropdownItems && "rounded-b-none",
            )}
            shouldFilter={false}
          >
            <CommandInput
              containerClassName={cn(
                !query && "border-transparent",
                hasDropdownItems && "border-transparent",
              )}
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  trimmedQuery &&
                  filteredUsers.length === 0
                ) {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
            />
            {hasDropdownItems && (
              <CommandList className="bg-popover absolute top-full right-0 left-0 z-10 max-h-60 rounded-t-none rounded-b-md border border-t-0 shadow-md">
                <CommandGroup>
                  {filteredUsers.slice(0, 8).map(({ item: user }) => (
                    <CommandItem
                      key={user.id}
                      value={user.id.toString()}
                      onSelect={() => handleSelectUser(user)}
                    >
                      <Avatar
                        className="size-5"
                        cloudflareId={user.avatarId}
                        alt={user.name}
                      >
                        <AvatarImage width={20} quality={85} />
                        <AvatarFallback
                          className="text-[10px]"
                          name={user.name}
                        />
                      </Avatar>
                      <span>{user.name}</span>
                    </CommandItem>
                  ))}
                  {showAddCustom && (
                    <CommandItem
                      value={`add-custom-${trimmedQuery}`}
                      onSelect={handleAddCustom}
                      className="text-muted-foreground"
                    >
                      <Plus className="size-4" />
                      <span>
                        Add "
                        <span className="text-foreground font-medium">
                          {trimmedQuery}
                        </span>
                        "
                      </span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
        </div>
      )}

      {displayName && (
        <div className="bg-muted/50 flex h-9 items-center gap-2 rounded-md border px-2">
          {selectedUser ? (
            <Avatar
              className="size-5"
              cloudflareId={selectedUser.avatarId}
              alt={selectedUser.name}
            >
              <AvatarImage width={20} quality={85} />
              <AvatarFallback
                className="text-[10px]"
                name={selectedUser.name}
              />
            </Avatar>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-full text-[10px] font-medium">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{displayName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
