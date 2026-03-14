import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { UserOnlineStatus } from "~/components/user-online-status"

type UserChipProps = {
  user: {
    id: number
    name: string
    avatarId: string | null
  }
}

export function UserChip({ user }: UserChipProps) {
  return (
    <Link
      to="/users/$userId"
      params={{ userId: user.id }}
      className="bg-muted hover:bg-muted/70 flex items-center gap-1.5 rounded-full p-1 pr-2 text-sm transition-colors"
    >
      <Avatar className="size-5" cloudflareId={user.avatarId} alt={user.name}>
        <AvatarImage width={40} quality={55} />
        <AvatarFallback name={user.name} />
      </Avatar>
      <span>{user.name}</span>
      <UserOnlineStatus userId={user.id} />
    </Link>
  )
}
