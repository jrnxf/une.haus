import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { UserOnlineStatus } from "~/components/user-online-status"

export function MessageAuthor({
  message,
}: {
  message: { user: { id: number; name: string; avatarId?: string | null } }
}) {
  return (
    <Link
      className="ring-offset-background focus-visible:ring-ring mb-1.5 flex w-max items-center gap-2 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      to={`/users/$userId`}
      params={{
        userId: message.user.id,
      }}
    >
      <Avatar
        className="size-6"
        cloudflareId={message.user.avatarId}
        alt={message.user.name}
      >
        <AvatarImage width={48} quality={70} />
        <AvatarFallback name={message.user.name} />
      </Avatar>
      {message.user.name}
      <UserOnlineStatus userId={message.user.id} />
    </Link>
  )
}
