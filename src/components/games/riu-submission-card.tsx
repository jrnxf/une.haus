import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Metaline } from "~/components/ui/metaline"
import { StatBadge } from "~/components/ui/stat-badge"
import { cn } from "~/lib/utils"

type RiuSubmissionCardProps = {
  submission: {
    id: number
    likes?: unknown[]
    messages?: unknown[]
  }
  set: {
    user: {
      id: number
      name: string
    }
    name: string
    instructions: string | null
  }
  className?: string
}

export function RiuSubmissionCard({
  submission,
  set,
  className,
}: RiuSubmissionCardProps) {
  const likeCount = Array.isArray(submission.likes)
    ? submission.likes.length
    : 0
  const messageCount = Array.isArray(submission.messages)
    ? submission.messages.length
    : 0

  const metaParts = [set.user.name, set.instructions].filter(
    Boolean,
  ) as string[]

  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" className="flex w-full min-w-0 p-3" asChild>
        <Link
          to="/games/rius/submissions/$submissionId"
          params={{ submissionId: submission.id }}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="min-w-0 truncate text-sm font-medium">
              {set.name}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-6">
              {metaParts.length > 0 && <Metaline parts={metaParts} />}
              <div className="flex shrink-0 items-center justify-end gap-2 text-xs">
                <StatBadge icon={HeartIcon} count={likeCount} label="like" />
                <StatBadge
                  icon={MessageCircleIcon}
                  count={messageCount}
                  label="message"
                />
              </div>
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
