import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

type RiderEntry = {
  userId: number | null;
  name: string | null;
};

type User = {
  id: number;
  name: string;
  avatarId: string | null;
};

export function RiderSelector({
  value,
  onChange,
}: {
  value: RiderEntry[];
  onChange: (riders: RiderEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");

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
  const filteredUsers = fzf.find(query.toLowerCase());

  // Get user data for selected riders
  const usersMap = useMemo(() => {
    const map = new Map<number, User>();
    for (const user of users) {
      map.set(user.id, user);
    }
    return map;
  }, [users]);

  const handleSelectUser = (user: User) => {
    // Check if already added
    if (value.some((r) => r.userId === user.id)) {
      return;
    }
    // Store user's name so it's available in diffs without additional lookups
    onChange([...value, { userId: user.id, name: user.name }]);
    setOpen(false);
    setQuery("");
  };

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    // Check if already added
    if (value.some((r) => r.name === trimmed && r.userId === null)) {
      return;
    }
    onChange([...value, { userId: null, name: trimmed }]);
    setCustomName("");
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
            >
              Search users
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search users..."
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>No users found</CommandEmpty>
                <CommandGroup>
                  {filteredUsers.slice(0, 20).map(({ item: user }) => {
                    const isSelected = value.some((r) => r.userId === user.id);
                    return (
                      <CommandItem
                        key={user.id}
                        value={user.id.toString()}
                        onSelect={() => handleSelectUser(user)}
                        disabled={isSelected}
                      >
                        <div className="flex items-center gap-2">
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
                        </div>
                        <Check
                          className={cn(
                            "ml-auto size-4",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Or add custom name..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleAddCustom}
          disabled={!customName.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((rider, index) => {
            const user = rider.userId ? usersMap.get(rider.userId) : null;
            const displayName = user?.name ?? rider.name ?? "Unknown";

            return (
              <Badge key={index} variant="secondary" className="gap-1 pr-1">
                {user && (
                  <Avatar
                    className="size-4"
                    cloudflareId={user.avatarId}
                    alt={user.name}
                  >
                    <AvatarImage width={16} quality={85} />
                    <AvatarFallback className="text-[8px]" name={user.name} />
                  </Avatar>
                )}
                {displayName}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="hover:bg-muted rounded-sm p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
