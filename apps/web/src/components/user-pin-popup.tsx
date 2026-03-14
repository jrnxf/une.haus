import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { FlagEmoji } from "~/components/ui/flag-emoji"
import { ScrollArea } from "~/components/ui/scroll-area"

type UserPinPopupProps = {
  users: {
    id: number
    name: string
    avatarId: string | null
    label: string
    countryCode: string | null
  }[]
}

export function UserPinPopup({ users }: UserPinPopupProps) {
  const showScrollArea = users.length > 3

  const content = (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-2">
          <Avatar
            cloudflareId={user.avatarId}
            alt={user.name}
            className="size-8"
          >
            <AvatarImage width={80} quality={80} className="object-cover" />
            <AvatarFallback
              className="flex items-center justify-center text-sm font-medium"
              name={user.name}
            />
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate leading-snug font-medium">
              {user.name}
            </span>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {user.countryCode && (
                <FlagEmoji
                  className="text-sm"
                  location={{ countryCode: user.countryCode }}
                />
              )}
              <span className="truncate">{user.label}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" asChild className="mr-1.5">
            <Link to="/users/$userId" params={{ userId: user.id }}>
              view
            </Link>
          </Button>
        </div>
      ))}
    </div>
  )

  if (showScrollArea) {
    return (
      <ScrollArea className="max-h-[200px] w-[280px] pr-3">
        {content}
      </ScrollArea>
    )
  }

  return <div className="w-[280px]">{content}</div>
}
