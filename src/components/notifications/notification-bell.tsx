import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Bell, Check, Loader2, Settings } from "lucide-react"

import { formatActorNames, NotificationIcon } from "./notification-item"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { ScrollArea } from "~/components/ui/scroll-area"
import { notifications } from "~/lib/notifications"
import {
  useMarkAllNotificationsRead,
  useMarkGroupRead,
} from "~/lib/notifications/hooks"
import {
  getNotificationAction,
  getNotificationUrl,
} from "~/lib/notifications/utils"
import { cn } from "~/lib/utils"

type NotificationBellProps = {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { data: unreadCount = 0 } = useQuery(
    notifications.unreadCount.queryOptions(),
  )

  const { data: groupedNotifications, isLoading } = useQuery({
    ...notifications.grouped.queryOptions({ limit: 10, unreadOnly: false }),
  })

  const markAllRead = useMarkAllNotificationsRead()
  const markGroupRead = useMarkGroupRead()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <CountChip className="absolute -top-1 -right-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </CountChip>
          )}
          <span className="sr-only">
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "notifications"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 overflow-hidden p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-2.5 py-1.5">
          <h3 className="text-xs font-semibold">notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-1.5 py-0.5 text-[10px]"
                onClick={() => markAllRead.mutate({ data: {} })}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="mr-1 size-2.5 animate-spin" />
                ) : (
                  <Check className="mr-1 size-2.5" />
                )}
                mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="bg-background/50 h-auto border px-1.5 py-0.5 text-[10px] backdrop-blur-sm"
              asChild
            >
              <Link to="/notifications/settings">
                <Settings className="size-2.5" />
                settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : groupedNotifications && groupedNotifications.length > 0 ? (
            <div className="relative flex flex-col py-1">
              {groupedNotifications.map((notification, index) => {
                const isLast = index === groupedNotifications.length - 1
                const actors = notification.actors as {
                  id: number
                  name: string
                  avatarId: string | null
                }[]
                const primaryActor = actors[0]
                const url = getNotificationUrl(
                  notification.entityType,
                  notification.entityId,
                  notification.data,
                )
                const action = getNotificationAction(
                  notification.type,
                  notification.entityType,
                  notification.data?.entityTitle,
                )
                const names = formatActorNames(
                  actors.map((a) => a.name),
                  notification.count,
                )

                return (
                  <div
                    key={`${notification.type}-${notification.entityType}-${notification.entityId}`}
                    className="relative flex items-start py-1.5 pl-6"
                  >
                    {!isLast && (
                      <div className="bg-border absolute top-[18px] -bottom-4 left-[7px] w-px" />
                    )}
                    <div
                      className={cn(
                        "absolute top-[8px] left-0 flex size-4 items-center justify-center rounded-full border",
                        notification.isRead
                          ? "bg-background"
                          : "border-primary bg-accent",
                      )}
                    >
                      <NotificationIcon
                        type={notification.type}
                        entityTitle={notification.data?.entityTitle}
                      />
                    </div>
                    <Link
                      to={url}
                      onClick={
                        notification.isRead
                          ? undefined
                          : () =>
                              markGroupRead.mutate({
                                data: {
                                  type: notification.type,
                                  entityType: notification.entityType,
                                  entityId: notification.entityId,
                                },
                              })
                      }
                      className="group hover:bg-accent/50 flex min-w-0 flex-1 items-start gap-1.5 rounded-md px-1.5 py-1 transition-colors"
                    >
                      {primaryActor && (
                        <Avatar
                          cloudflareId={primaryActor.avatarId}
                          alt={primaryActor.name}
                          className="size-4 shrink-0"
                        >
                          <AvatarImage width={32} quality={85} />
                          <AvatarFallback
                            name={primaryActor.name}
                            className="text-[7px]"
                          />
                        </Avatar>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="min-w-0 flex-1 truncate text-xs">
                            <span className="font-medium">{names}</span>{" "}
                            <span className="text-muted-foreground">
                              {action}
                            </span>
                          </p>
                          <span className="text-muted-foreground shrink-0 text-[10px]">
                            <RelativeTimeCard
                              date={new Date(notification.latestAt)}
                              variant="muted"
                            />
                          </span>
                          {!notification.isRead && (
                            <div className="-ml-1.5 w-0 shrink-0 overflow-hidden transition-all group-hover:ml-0 group-hover:w-5">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="size-5"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  markGroupRead.mutate({
                                    data: {
                                      type: notification.type,
                                      entityType: notification.entityType,
                                      entityId: notification.entityId,
                                    },
                                  })
                                }}
                              >
                                <Check className="size-2.5" />
                                <span className="sr-only">mark as read</span>
                              </Button>
                            </div>
                          )}
                        </div>
                        {notification.data?.entityPreview && (
                          <p className="text-muted-foreground text-[10px] italic">
                            &quot;{notification.data.entityPreview}&quot;
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-muted-foreground py-6 text-center text-xs">
              no notifications yet
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full py-1 text-[10px]"
            asChild
          >
            <Link to="/notifications">view all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
