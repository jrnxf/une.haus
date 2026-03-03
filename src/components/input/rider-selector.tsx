import { useQuery } from "@tanstack/react-query"
import { GripVerticalIcon, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { Button } from "~/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "~/components/ui/sortable"
import { generateOrderId, type OrderedRiderEntry } from "~/lib/tourney/bracket"
import { users as usersApi } from "~/lib/users"
import { cn } from "~/lib/utils"
import { useFzf } from "~/lib/ux/hooks/use-fzf"

type User = {
  id: number
  name: string
  avatarId: string | null
}

export function RiderSelector({
  value,
  onChange,
}: {
  value: OrderedRiderEntry[]
  onChange: (riders: OrderedRiderEntry[]) => void
}) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: users = [] } = useQuery(usersApi.all.queryOptions())

  const searchReadyUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        searchKey: user.name.toLowerCase(),
      })),
    [users],
  )

  const selectedUserIds = useMemo(
    () => new Set(value.filter((r) => r.userId).map((r) => r.userId)),
    [value],
  )

  const fzf = useFzf([searchReadyUsers, { selector: (user) => user.searchKey }])
  const allMatchingUsers = query ? fzf.find(query.toLowerCase()) : []
  const filteredUsers = allMatchingUsers.filter(
    ({ item }) => !selectedUserIds.has(item.id),
  )

  // Get user data for selected riders
  const usersMap = useMemo(() => {
    const map = new Map<number, User>()
    for (const user of users) {
      map.set(user.id, user)
    }
    return map
  }, [users])

  const handleSelectUser = (user: User) => {
    // Check if already added
    if (value.some((r) => r.userId === user.id)) {
      return
    }
    onChange([
      ...value,
      { orderId: generateOrderId(), userId: user.id, name: user.name },
    ])
    setQuery("")
    inputRef.current?.focus()
  }

  const handleAddCustom = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    // Check if already added (as custom name)
    if (
      value.some(
        (r) =>
          r.name?.toLowerCase() === trimmed.toLowerCase() && r.userId === null,
      )
    ) {
      return
    }
    // Check if it matches an existing user exactly - add them instead
    const exactMatch = users.find(
      (u) => u.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exactMatch && !value.some((r) => r.userId === exactMatch.id)) {
      onChange([
        ...value,
        {
          orderId: generateOrderId(),
          userId: exactMatch.id,
          name: exactMatch.name,
        },
      ])
    } else if (!exactMatch) {
      onChange([
        ...value,
        { orderId: generateOrderId(), userId: null, name: trimmed },
      ])
    }
    setQuery("")
    inputRef.current?.focus()
  }

  const handleRemove = (orderId: string) => {
    onChange(value.filter((r) => r.orderId !== orderId))
  }

  // Check if query exactly matches a user or is already added
  const trimmedQuery = query.trim()
  const exactUserMatch = users.find(
    (u) => u.name.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const isAlreadyAdded = exactUserMatch
    ? value.some((r) => r.userId === exactUserMatch.id)
    : value.some(
        (r) =>
          r.name?.toLowerCase() === trimmedQuery.toLowerCase() &&
          r.userId === null,
      )

  const showAddCustom = trimmedQuery && !isAlreadyAdded

  // Determine what name to show for "already in bracket" message
  let alreadyAddedName: string | null = null
  if (isAlreadyAdded) {
    // Exact match (user or custom name) is already added
    alreadyAddedName = exactUserMatch?.name ?? trimmedQuery
  } else if (allMatchingUsers.length > 0 && filteredUsers.length === 0) {
    // All fuzzy matches are already added
    alreadyAddedName = allMatchingUsers[0]?.item.name ?? null
  }

  const hasDropdownItems =
    query && (filteredUsers.length > 0 || showAddCustom || alreadyAddedName)

  return (
    <div className="space-y-2">
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
            placeholder="search..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              // Only handle Enter for custom add when no users match
              if (
                e.key === "Enter" &&
                trimmedQuery &&
                !isAlreadyAdded &&
                filteredUsers.length === 0
              ) {
                e.preventDefault()
                handleAddCustom()
              }
            }}
          />
          {hasDropdownItems && (
            <CommandList className="bg-popover absolute top-full right-0 left-0 z-10 max-h-60 rounded-t-none rounded-b-md border border-t-0 shadow-md">
              {alreadyAddedName && filteredUsers.length === 0 ? (
                <CommandEmpty>
                  {alreadyAddedName} already in bracket
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredUsers.slice(0, 8).map(({ item: user }) => (
                    <CommandItem
                      key={user.id}
                      value={user.id.toString()}
                      onSelect={() => handleSelectUser(user)}
                    >
                      <span>{user.name}</span>
                    </CommandItem>
                  ))}
                  {showAddCustom && (
                    <CommandItem
                      value={`add-custom-${trimmedQuery}`}
                      onSelect={handleAddCustom}
                      className="text-muted-foreground"
                    >
                      <span>
                        "
                        <span className="text-foreground font-medium">
                          {trimmedQuery}
                        </span>
                        "
                      </span>
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>

      {value.length > 0 && (
        <Sortable
          value={value}
          onValueChange={onChange}
          getItemValue={(item) => item.orderId}
          className="space-y-1"
        >
          {value.map((rider, index) => {
            const user = rider.userId ? usersMap.get(rider.userId) : null
            const displayName = user?.name ?? rider.name ?? "Unknown"
            const seed = index + 1

            return (
              <SortableItem
                key={rider.orderId}
                value={rider.orderId}
                className="bg-muted/70 flex items-center gap-2 rounded-md border px-2 py-1.5"
              >
                <SortableItemHandle className="text-muted-foreground hover:text-foreground">
                  <GripVerticalIcon className="size-4" />
                </SortableItemHandle>
                <span className="text-muted-foreground w-4 text-center text-xs font-medium tabular-nums">
                  {seed}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {displayName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemove(rider.orderId)}
                  aria-label={`Remove ${displayName}`}
                >
                  <X className="size-3.5" />
                </Button>
              </SortableItem>
            )
          })}
        </Sortable>
      )}
    </div>
  )
}
