import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"

export function MemberCell({
  member,
}: {
  member: { id: number; name: string; avatarId: string | null }
}) {
  return (
    <Link
      to="/users/$userId"
      params={{ userId: member.id }}
      className="flex items-center gap-2 font-medium hover:underline"
    >
      <Avatar
        cloudflareId={member.avatarId}
        alt={member.name}
        className="size-5"
      >
        <AvatarImage width={60} quality={70} loading="lazy" />
        <AvatarFallback name={member.name} />
      </Avatar>
      <span className="max-w-40 truncate">{member.name}</span>
    </Link>
  )
}
