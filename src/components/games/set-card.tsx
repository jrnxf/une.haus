import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon, UploadIcon } from "lucide-react"
import pluralize from "pluralize"

import { RichText } from "~/components/rich-text"
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
  showAuthor?: boolean
  className?: string
}

export function SetCard({ set, showAuthor = false, className }: SetCardProps) {
  const record = { type: "riuSet" as const, id: set.id }
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record))

  const messageCount = messagesQuery.data.messages.length
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0
  const submissionCount = Array.isArray(set.submissions)
    ? set.submissions.length
    : 0

  return (
    <div className={cn("group relative", className)}>
      <div className="bg-card rounded-md border p-3">
        <Link
          to="/games/rius/sets/$setId"
          params={{ setId: set.id }}
          className="w-fit truncate text-sm font-medium after:absolute after:inset-0 after:rounded-md"
        >
          {set.name}
        </Link>

        {showAuthor && (
          <p className="text-muted-foreground text-xs">{set.user.name}</p>
        )}

        <div className="text-muted-foreground mt-1 flex items-center justify-between gap-4 text-xs">
          {set.instructions ? (
            <div className="relative z-10 min-w-0 flex-1 truncate">
              <RichText content={set.instructions} disableLinks />
            </div>
          ) : (
            <div />
          )}

          <div className="flex shrink-0 items-center gap-2">
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
        </div>
      </div>
    </div>
  )
}

type StatBadgeProps = {
  icon: React.ComponentType<{ className?: string }>
  count: number
  label: string
}

function StatBadge({ icon: Icon, count, label }: StatBadgeProps) {
  return (
    <div
      className="flex items-center gap-1"
      title={`${count} ${pluralize(label, count)}`}
    >
      <Icon className="size-3" />
      <span>{count}</span>
    </div>
  )
}
