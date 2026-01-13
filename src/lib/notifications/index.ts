import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import {
  deleteNotificationServerFn,
  getUnreadCountServerFn,
  listGroupedNotificationsServerFn,
  listNotificationsServerFn,
  markAllReadServerFn,
  markGroupReadServerFn,
  markReadServerFn,
} from "~/lib/notifications/fns";
import {
  deleteNotificationSchema,
  listNotificationsSchema,
  markAllReadSchema,
  markGroupReadSchema,
  markReadSchema,
} from "~/lib/notifications/schemas";
import type { ServerFnData } from "~/lib/types";

export const notifications = {
  list: {
    fn: listNotificationsServerFn,
    schema: listNotificationsSchema,
    infiniteQueryOptions: (
      data?: Omit<ServerFnData<typeof listNotificationsServerFn>, "cursor">,
    ) =>
      infiniteQueryOptions({
        queryKey: ["notifications.list", data],
        queryFn: ({ pageParam: cursor }) =>
          listNotificationsServerFn({
            data: { ...data, cursor },
          }),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }),
  },
  grouped: {
    fn: listGroupedNotificationsServerFn,
    queryOptions: (
      data?: Omit<ServerFnData<typeof listGroupedNotificationsServerFn>, "cursor">,
    ) =>
      queryOptions({
        queryKey: ["notifications.grouped", data],
        queryFn: () => listGroupedNotificationsServerFn({ data: data ?? {} }),
      }),
  },
  unreadCount: {
    fn: getUnreadCountServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["notifications.unreadCount"],
        queryFn: getUnreadCountServerFn,
        // Refetch every 30 seconds for near-realtime updates
        refetchInterval: 30_000,
      }),
  },
  markRead: {
    fn: markReadServerFn,
    schema: markReadSchema,
  },
  markGroupRead: {
    fn: markGroupReadServerFn,
    schema: markGroupReadSchema,
  },
  markAllRead: {
    fn: markAllReadServerFn,
    schema: markAllReadSchema,
  },
  delete: {
    fn: deleteNotificationServerFn,
    schema: deleteNotificationSchema,
  },
};
