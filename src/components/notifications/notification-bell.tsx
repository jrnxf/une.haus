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
import { Separator } from "~/components/ui/separator";
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
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => markAllRead.mutate({ data: {} })}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Check className="mr-1 size-3" />
                )}
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-7" asChild>
              <Link to="/notifications/settings">
                <Settings className="size-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
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
            <div className="text-muted-foreground py-8 text-center text-sm">
              No notifications yet
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="p-2">
          <Button variant="ghost" className="w-full" asChild>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
