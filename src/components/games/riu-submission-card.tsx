import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"
import { type ReactNode } from "react"

import { Button } from "~/components/ui/button"
import { StatBadge } from "~/components/ui/stat-badge"
import { cn } from "~/lib/utils"

type RiuSubmissionCardProps = {
  submission: {
    id: number
    likes?: unknown[]
    messages?: unknown[]
  }
  header: ReactNode
  className?: string
}

export function RiuSubmissionCard({
  submission,
  header,
  className,
}: RiuSubmissionCardProps) {
  const likeCount = Array.isArray(submission.likes)
    ? submission.likes.length
    : 0
  const messageCount = Array.isArray(submission.messages)
    ? submission.messages.length
    : 0

  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" className="flex w-full p-3" asChild>
        <Link
          to="/games/rius/submissions/$submissionId"
          params={{ submissionId: submission.id }}
        >
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">{header}</div>

            <div className="flex shrink-0 items-center justify-end gap-2 text-xs">
              <StatBadge icon={HeartIcon} count={likeCount} label="like" />
              <StatBadge
                icon={MessageCircleIcon}
                count={messageCount}
                label="message"
              />
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
