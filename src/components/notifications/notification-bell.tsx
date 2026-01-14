import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2, Settings } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { notifications } from "~/lib/notifications";
import {
  useMarkAllNotificationsRead,
  useMarkGroupRead,
} from "~/lib/notifications/hooks";
import { cn } from "~/lib/utils";

import { NotificationItem } from "./notification-item";

type NotificationBellProps = {
  className?: string;
};

export function NotificationBell({ className }: NotificationBellProps) {
  const { data: unreadCount = 0 } = useQuery(
    notifications.unreadCount.queryOptions(),
  );

  const { data: groupedNotifications, isLoading } = useQuery({
    ...notifications.grouped.queryOptions({ limit: 10, unreadOnly: false }),
  });

  const markAllRead = useMarkAllNotificationsRead();
  const markGroupRead = useMarkGroupRead();

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
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[10px] font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 overflow-hidden p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-2.5 py-1.5">
          <h3 className="text-xs font-semibold">Notifications</h3>
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
                Mark all read
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
                Settings
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
            <div className="divide-y">
              {groupedNotifications.map((notification) => (
                <NotificationItem
                  key={`${notification.type}-${notification.entityType}-${notification.entityId}`}
                  type={notification.type}
                  entityType={notification.entityType}
                  entityId={notification.entityId}
                  count={notification.count}
                  actors={
                    notification.actors as {
                      id: number;
                      name: string;
                      avatarId: string | null;
                    }[]
                  }
                  data={notification.data}
                  latestAt={notification.latestAt}
                  isRead={notification.isRead}
                  onMarkRead={() =>
                    markGroupRead.mutate({
                      data: {
                        type: notification.type,
                        entityType: notification.entityType,
                        entityId: notification.entityId,
                      },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-6 text-center text-xs">
              No notifications yet
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
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
