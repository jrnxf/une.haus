import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { StatBadge } from "~/components/ui/stat-badge"
import { cn } from "~/lib/utils"

type SiuSetCardProps = {
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
  className?: string
}

export function SiuSetCard({ set, className }: SiuSetCardProps) {
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0
  const messageCount = Array.isArray(set.messages) ? set.messages.length : 0

  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" asChild className="flex w-full p-3">
        <Link to="/games/sius/sets/$setId" params={{ setId: set.id }}>
          <div className="flex w-full items-start gap-2.5">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{set.name}</span>
              </div>

              <div className="flex w-full items-center justify-between gap-2">
                <Metaline
                  className="relative z-10 text-xs"
                  parts={[
                    set.user.name,
                    <RelativeTimeCard
                      key="created-at"
                      className="text-xs"
                      variant="muted"
                      date={set.createdAt}
                    />,
                  ]}
                />

                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <StatBadge icon={HeartIcon} count={likeCount} label="like" />
                  <StatBadge
                    icon={MessageCircleIcon}
                    count={messageCount}
                    label="message"
                  />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
