import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { type ReactNode } from "react"

import { NotificationIcon } from "./notification-item"
import { Button } from "~/components/ui/button"
import { type NotificationType } from "~/db/schema"
import { cn } from "~/lib/utils"

type NotificationTimelineItemProps = {
  isLast: boolean
  isRead: boolean
  type: NotificationType
  entityTitle?: string
  avatar: ReactNode
  names: string
  action: string
  time: ReactNode
  preview?: string
  onMarkRead?: () => void
  href?: string
  onNavigate?: () => void
}

export function NotificationTimeline({ children }: { children: ReactNode }) {
  return <div className="relative flex flex-col">{children}</div>
}

export function NotificationTimelineItem({
  isLast,
  isRead,
  type,
  entityTitle,
  avatar,
  names,
  action,
  time,
  preview,
  onMarkRead,
  href,
  onNavigate,
}: NotificationTimelineItemProps) {
  const content = (
    <>
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{names}</span>{" "}
            <span className="text-muted-foreground">{action}</span>
          </p>
          <span className="text-muted-foreground shrink-0 text-xs">{time}</span>
          {!isRead && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              onClick={
                onMarkRead
                  ? (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onMarkRead()
                    }
                  : undefined
              }
            >
              <Check className="size-3" />
              <span className="sr-only">mark as read</span>
            </Button>
          )}
        </div>
        {preview && (
          <p className="text-muted-foreground text-xs italic">
            &quot;{preview}&quot;
          </p>
        )}
      </div>
    </>
  )

  const contentClassName =
    "hover:bg-accent/50 flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-1 transition-colors"

  return (
    <div className="relative flex items-start py-2 pl-7">
      {!isLast && (
        <div className="bg-border absolute top-[22px] -bottom-6 left-[9px] w-px" />
      )}
      <div
        className={cn(
          "absolute top-[12px] left-0 flex size-5 items-center justify-center rounded-full border",
          isRead ? "bg-background" : "bg-accent",
        )}
      >
        <NotificationIcon type={type} entityTitle={entityTitle} />
      </div>
      {href ? (
        <Link to={href} onClick={onNavigate} className={contentClassName}>
          {content}
        </Link>
      ) : (
        <div className={contentClassName}>{content}</div>
      )}
    </div>
  )
}
