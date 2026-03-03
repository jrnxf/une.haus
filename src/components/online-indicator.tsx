import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { StatusIndicator } from "~/components/ui/status"
import { presence } from "~/lib/presence"
import { cn } from "~/lib/utils"

function OnlineTrigger({
  total,
  className,
  ...props
}: { total: number; className?: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-fit cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
        "text-muted-foreground hover:bg-accent/50",
        "[[data-mobile=true]_&]:hidden",
        className,
      )}
      {...props}
    >
      <StatusIndicator className="bg-green-500" />
      <span>{total} online</span>
    </button>
  )
}

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
    <div className="flex flex-col gap-1">
      {users.map((user) => (
        <Link
          key={user.id}
          to="/users/$userId"
          params={{ userId: user.id }}
          onClick={onNavigate}
          className="hover:bg-accent flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
        >
          <Avatar
            className="size-4"
            cloudflareId={user.avatarId}
            alt={user.name}
          >
            <AvatarImage width={32} quality={90} />
            <AvatarFallback name={user.name} />
          </Avatar>
          <span className="text-[11px] font-medium">{user.name}</span>
        </Link>
      ))}
      {guests > 0 && (
        <div className="text-muted-foreground flex items-center px-1.5 text-xs">
          {users.length > 0 ? "+" : ""}
          {guests} anonymous
        </div>
      )}
    </div>
  )
}

export function OnlineIndicator({ className }: { className?: string }) {
  const { data } = useSuspenseQuery(presence.online.queryOptions())
  const [open, setOpen] = useState(false)

  if (data.total === 0) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <OnlineTrigger total={data.total} className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-0">
        <OnlineUserList
          users={data.users}
          guests={data.guests}
          onNavigate={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
