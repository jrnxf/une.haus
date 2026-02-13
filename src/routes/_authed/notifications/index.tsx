import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, GhostIcon, Loader2, WrenchIcon } from "lucide-react";
import { useState } from "react";

import { NotificationItem } from "~/components/notifications/notification-item";
import { PageHeader } from "~/components/page-header";
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
      <PageHeader maxWidth="2xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>notifications</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
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
      </PageHeader>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl p-4">
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

        {/* Notification list */}
        {groupedNotifications && groupedNotifications.length > 0 ? (
          <div className="divide-y overflow-clip rounded-lg border bg-card">
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
