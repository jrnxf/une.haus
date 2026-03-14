import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon, UploadIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Metaline } from "~/components/ui/metaline"
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
  showAuthor?: boolean
}

export function SetCard({
  set,
  className,
  showStats = true,
  showAuthor = true,
}: SetCardProps) {
  const messageCount = Array.isArray(set.messages) ? set.messages.length : 0
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0
  const submissionCount = Array.isArray(set.submissions)
    ? set.submissions.length
    : 0

  const metaParts = [
    showAuthor ? set.user.name : null,
    set.instructions,
  ].filter(Boolean) as string[]

  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" className="flex w-full min-w-0 p-3" asChild>
        <Link to="/games/rius/sets/$setId" params={{ setId: set.id }}>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="min-w-0 truncate text-sm font-medium">
              {set.name}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-6">
              {metaParts.length > 0 && <Metaline parts={metaParts} />}
              {showStats && (
                <div className="flex shrink-0 items-center justify-end gap-2 text-xs">
                  <StatBadge
                    icon={MessageCircleIcon}
                    count={messageCount}
                    label="message"
                  />
                  <StatBadge icon={HeartIcon} count={likeCount} label="like" />
                  <StatBadge
                    icon={UploadIcon}
                    count={submissionCount}
                    label="submission"
                  />
                </div>
              )}
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
