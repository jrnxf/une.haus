import { Link } from "@tanstack/react-router"

import { UserOnlineStatus } from "~/components/user-online-status"

export function MessageAuthor({
  message,
}: {
  message: { user: { id: number; name: string } }
}) {
  return (
    <Link
      className="ring-offset-background focus-visible:ring-ring mb-1 flex w-max items-center gap-1.5 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden sm:text-base"
      to={`/users/$userId`}
      params={{
        userId: message.user.id,
      }}
    >
      {message.user.name}
      <UserOnlineStatus userId={message.user.id} />
    </Link>
  )
}
