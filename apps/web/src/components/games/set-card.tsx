import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { StatBadge } from "~/components/ui/stat-badge"
import { cn } from "~/lib/utils"

type SetCardProps = {
  set: {
    id: number
    name: string
    instructions: string | null
    createdAt: Date
    user: {
      id: number
      name: string
      avatarId: string | null
    }
    likes?: unknown[]
    messages?: unknown[]
    submissions?: unknown[]
  }
  className?: string
  showStats?: boolean
}

export function SetCard({ set, className, showStats = true }: SetCardProps) {
  const messageCount = Array.isArray(set.messages) ? set.messages.length : 0
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0

  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" className="flex w-full min-w-0 p-3" asChild>
        <Link to="/games/rius/sets/$setId" params={{ setId: set.id }}>
          <div className="flex w-full min-w-0 items-center justify-between gap-4">
            <div className="truncate">{set.name}</div>
            <div>
              {showStats && (
                <div className="flex shrink-0 items-center justify-end gap-2 text-xs">
                  <StatBadge
                    icon={MessageCircleIcon}
                    count={messageCount}
                    label="message"
                  />
                  <StatBadge icon={HeartIcon} count={likeCount} label="like" />
                  {/* <StatBadge
                    icon={UploadIcon}
                    count={submissionCount}
                    label="submission"
                  /> */}
                </div>
              )}
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
