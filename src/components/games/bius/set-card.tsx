import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { cn } from "~/lib/utils"

type BiuSetCardProps = {
  set: {
    id: number
    name: string
    position: number
    createdAt: Date
    user: {
      id: number
      name: string
      avatarId: string | null
    }
    likes?: unknown[]
    messages?: unknown[]
    parentSet?: {
      id: number
      name: string
      user?: {
        id: number
        name: string
      }
    } | null
  }
  isLatest?: boolean
  className?: string
}

export function BiuSetCard({
  set,
  isLatest = false,
  className,
}: BiuSetCardProps) {
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0
  const messageCount = Array.isArray(set.messages) ? set.messages.length : 0

  return (
    <div className={cn("group relative z-20", className)}>
      <div
        className={cn(
          "bg-card overflow-hidden rounded-md border transition-colors",
          "hover:bg-muted/70",
        )}
      >
        {/* Main card content */}
        <div className="p-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                to="/games/bius/sets/$setId"
                params={{ setId: set.id }}
                className="truncate text-sm font-medium after:absolute after:inset-0 after:rounded-md"
              >
                {set.name}
              </Link>
              {isLatest && (
                <Badge variant="outline" className="text-[10px]">
                  latest
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <Link
                  to="/users/$userId"
                  params={{ userId: set.user.id }}
                  className="relative z-10 hover:underline"
                >
                  {set.user.name}
                </Link>
                <span className="opacity-25">/</span>
                <RelativeTimeCard
                  date={set.createdAt}
                  variant="muted"
                  className="text-xs"
                />
              </p>

              <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                <span className="flex items-center gap-0.5">
                  <HeartIcon className="size-3" />
                  {likeCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircleIcon className="size-3" />
                  {messageCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
