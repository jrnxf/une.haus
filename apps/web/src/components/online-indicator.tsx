import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import pluralize from "pluralize"
import { Suspense, useState } from "react"

import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { StatusIndicator } from "~/components/ui/status"
import { presence } from "~/lib/presence"
import { cn } from "~/lib/utils"

function OnlineUserList({
  users,
  guests,
  onNavigate,
}: {
  users: { id: number; name: string; avatarId: string | null }[]
  guests: number
  onNavigate?: () => void
}) {
  return (
    <DropdownMenuGroup>
      {users.map((user) => (
        <DropdownMenuItem key={user.id} asChild>
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            replace
            onClick={onNavigate}
          >
            <span className="text-xs font-medium">{user.name}</span>
          </Link>
        </DropdownMenuItem>
      ))}
      {guests > 0 && (
        <DropdownMenuLabel>
          {users.length > 0 ? "+" : ""}
          {guests} {pluralize("guest", guests)}
        </DropdownMenuLabel>
      )}
    </DropdownMenuGroup>
  )
}

export function OnlineIndicator({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-fit text-xs leading-none in-data-[mobile=true]:hidden",
            className,
          )}
        >
          <span className="pr-1">
            <StatusIndicator className="bg-green-600" />
          </span>
          <OnlineCount />
          <span>online</span>
        </Button>
      </DropdownMenuTrigger>
      <Suspense>
        <OnlineDropdownContent onNavigate={() => setOpen(false)} />
      </Suspense>
    </DropdownMenu>
  )
}

function OnlineCount() {
  const { data } = useSuspenseQuery(presence.online.queryOptions())
  return <span>{data.total}</span>
}

function OnlineDropdownContent({ onNavigate }: { onNavigate: () => void }) {
  const { data } = useSuspenseQuery(presence.online.queryOptions())

  if (data.total === 0) return null

  return (
    <DropdownMenuContent align="start" className="min-w-0">
      <OnlineUserList
        users={data.users}
        guests={data.guests}
        onNavigate={onNavigate}
      />
    </DropdownMenuContent>
  )
}
