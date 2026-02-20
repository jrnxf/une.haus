import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, GhostIcon, Loader2, WrenchIcon } from "lucide-react";
import { useState } from "react";

import {
  formatActorNames,
  NotificationIcon,
} from "~/components/notifications/notification-item";
import { PageHeader } from "~/components/page-header";
import { TimeAgo } from "~/components/time-ago";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { notifications } from "~/lib/notifications";
import {
  useMarkAllNotificationsRead,
  useMarkGroupRead,
} from "~/lib/notifications/hooks";
import {
  getNotificationAction,
  getNotificationUrl,
} from "~/lib/notifications/utils";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_authed/notifications/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        notifications.grouped.queryOptions({ limit: 50, unreadOnly: false }),
      ),
      context.queryClient.ensureQueryData(
        notifications.unreadCount.queryOptions(),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const { data: unreadCount = 0 } = useSuspenseQuery(
    notifications.unreadCount.queryOptions(),
  );

  const { data: groupedNotifications } = useSuspenseQuery(
    notifications.grouped.queryOptions({
      limit: 50,
      unreadOnly: filter === "unread",
    }),
  );

  const markAllRead = useMarkAllNotificationsRead();
  const markGroupRead = useMarkGroupRead();

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>notifications</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate({ data: {} })}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Read
              </Button>
            )}
            <Button variant="secondary" size="sm" asChild>
              <Link to="/notifications/settings">
                <WrenchIcon className="size-4" />
              </Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4">
          {/* Tabs */}
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as "all" | "unread")}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="unread" className="text-xs">
                Unread
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Notification list - timeline */}
          {groupedNotifications && groupedNotifications.length > 0 ? (
            <div className="relative flex flex-col">
              {groupedNotifications.map((notification, index) => {
                const isLast = index === groupedNotifications.length - 1;
                const actors = notification.actors as {
                  id: number;
                  name: string;
                  avatarId: string | null;
                }[];
                const primaryActor = actors[0];
                const url = getNotificationUrl(
                  notification.entityType,
                  notification.entityId,
                  notification.data,
                );
                const action = getNotificationAction(
                  notification.type,
                  notification.entityType,
                  notification.data?.entityTitle,
                );
                const names = formatActorNames(
                  actors.map((a) => a.name),
                  notification.count,
                );

                return (
                  <div
                    key={`${notification.type}-${notification.entityType}-${notification.entityId}`}
                    className="relative flex items-center py-2 pl-7"
                  >
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="bg-border absolute top-1/2 -bottom-6 left-[9px] w-px" />
                    )}
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute top-1/2 left-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border",
                        notification.isRead
                          ? "bg-background"
                          : "bg-primary/10 border-primary/30",
                      )}
                    >
                      <NotificationIcon type={notification.type} />
                    </div>
                    {/* Content */}
                    <Link
                      to={url}
                      onClick={
                        !notification.isRead
                          ? () =>
                              markGroupRead.mutate({
                                data: {
                                  type: notification.type,
                                  entityType: notification.entityType,
                                  entityId: notification.entityId,
                                },
                              })
                          : undefined
                      }
                      className="group hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 transition-colors"
                    >
                      {primaryActor && (
                        <Avatar
                          cloudflareId={primaryActor.avatarId}
                          alt={primaryActor.name}
                          className="size-5 shrink-0"
                        >
                          <AvatarImage width={20} quality={75} />
                          <AvatarFallback
                            name={primaryActor.name}
                            className="text-[8px]"
                          />
                        </Avatar>
                      )}
                      <p className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{names}</span>{" "}
                        <span className="text-muted-foreground">{action}</span>
                      </p>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        <TimeAgo date={new Date(notification.latestAt)} />
                      </span>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markGroupRead.mutate({
                              data: {
                                type: notification.type,
                                entityType: notification.entityType,
                                entityId: notification.entityId,
                              },
                            });
                          }}
                        >
                          <Check className="size-3" />
                          <span className="sr-only">Mark as read</span>
                        </Button>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GhostIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === "unread"
                    ? "All caught up!"
                    : "No notifications yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {filter === "unread"
                    ? "You've read all your notifications."
                    : "When someone interacts with your content, you'll see it here."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}
