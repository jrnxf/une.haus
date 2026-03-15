import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Check, GhostIcon, Loader2 } from "lucide-react"
import { Suspense, useDeferredValue, useState } from "react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { formatActorNames } from "~/components/notifications/notification-item"
import {
  NotificationTimeline,
  NotificationTimelineItem,
} from "~/components/notifications/notification-timeline"
import { PageHeader } from "~/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { notifications } from "~/lib/notifications"
import {
  useMarkAllNotificationsRead,
  useMarkGroupRead,
} from "~/lib/notifications/hooks"
import {
  getNotificationAction,
  getNotificationUrl,
} from "~/lib/notifications/utils"

export const Route = createFileRoute("/_authed/notifications/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        notifications.grouped.queryOptions({ limit: 50, unreadOnly: true }),
      ),
      context.queryClient.ensureQueryData(
        notifications.unreadCount.queryOptions(),
      ),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [filter, setFilter] = useState<"all" | "unread">("unread")
  const deferredFilter = useDeferredValue(filter)

  const { data: unreadCount = 0 } = useSuspenseQuery(
    notifications.unreadCount.queryOptions(),
  )

  const markAllRead = useMarkAllNotificationsRead()

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>notifications</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4">
          <ContentHeaderRow
            className="max-w-none pb-4"
            left={
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as "all" | "unread")}
                className="w-fit"
              >
                <TabsList>
                  <TabsTrigger value="unread" className="text-xs">
                    unread
                    {unreadCount > 0 && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-[10px] leading-none font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">
                    all
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
            right={
              <>
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
                    read
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/notifications/settings">settings</Link>
                </Button>
              </>
            }
          />

          <Suspense>
            <NotificationList filter={deferredFilter} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function NotificationList({ filter }: { filter: "all" | "unread" }) {
  const { data: groupedNotifications } = useSuspenseQuery(
    notifications.grouped.queryOptions({
      limit: 50,
      unreadOnly: filter === "unread",
    }),
  )

  const markGroupRead = useMarkGroupRead()

  if (!groupedNotifications || groupedNotifications.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GhostIcon />
          </EmptyMedia>
          <EmptyTitle>
            {filter === "unread" ? "all caught up!" : "no notifications yet"}
          </EmptyTitle>
          <EmptyDescription>
            {filter === "unread"
              ? "you've read all your notifications."
              : "when someone interacts with your content, you'll see it here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <NotificationTimeline>
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
        const markData = {
          type: notification.type,
          entityType: notification.entityType,
          entityId: notification.entityId,
        } as const

        return (
          <NotificationTimelineItem
            key={`${notification.type}-${notification.entityType}-${notification.entityId}`}
            isLast={isLast}
            isRead={notification.isRead}
            type={notification.type}
            entityType={notification.entityType}
            entityTitle={notification.data?.entityTitle}
            avatar={
              primaryActor && (
                <Avatar
                  cloudflareId={primaryActor.avatarId}
                  alt={primaryActor.name}
                  className="size-5 shrink-0"
                >
                  <AvatarImage width={40} quality={85} />
                  <AvatarFallback
                    name={primaryActor.name}
                    className="text-[8px]"
                  />
                </Avatar>
              )
            }
            names={names}
            action={action}
            time={
              <RelativeTimeCard
                date={new Date(notification.latestAt)}
                variant="muted"
              />
            }
            preview={notification.data?.entityPreview}
            href={url}
            onNavigate={
              notification.isRead
                ? undefined
                : () => markGroupRead.mutate({ data: markData })
            }
            onMarkRead={() => markGroupRead.mutate({ data: markData })}
          />
        )
      })}
    </NotificationTimeline>
  )
}
