import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon, UploadIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { StatBadge } from "~/components/ui/stat-badge"
import { messages } from "~/lib/messages"
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
    submissions?: unknown[]
  }
  className?: string
  showStats?: boolean
}

export function SetCard({ set, className, showStats = true }: SetCardProps) {
  const record = { type: "riuSet" as const, id: set.id }
  const messagesQuery = useQuery({
    ...messages.list.queryOptions(record),
    enabled: showStats,
  })

  const messageCount = messagesQuery.data?.messages.length ?? 0
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0
  const submissionCount = Array.isArray(set.submissions)
    ? set.submissions.length
    : 0

  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" className="flex w-full p-3" asChild>
        <Link to="/games/rius/sets/$setId" params={{ setId: set.id }}>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-w-0 items-end justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="min-w-0 truncate text-sm font-medium">
                  {set.name}
                </span>
                {set.instructions && (
                  <span className="text-muted-foreground min-w-0 truncate text-xs">
                    {set.instructions}
                  </span>
                )}
              </div>

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
