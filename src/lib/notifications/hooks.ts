import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { notifications } from "~/lib/notifications";

const unreadCountKey = notifications.unreadCount.queryOptions().queryKey;

function invalidateAllNotifications(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["notifications.list"] });
  qc.invalidateQueries({ queryKey: ["notifications.grouped"] });
  qc.invalidateQueries({ queryKey: unreadCountKey });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.markRead.fn,
    onSuccess: () => invalidateAllNotifications(qc),
  });
}

export function useMarkGroupRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.markGroupRead.fn,
    onSuccess: () => invalidateAllNotifications(qc),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.markAllRead.fn,
    onMutate: async () => {
      // Optimistically set unread count to 0
      await qc.cancelQueries({ queryKey: unreadCountKey });
      const prev = qc.getQueryData<number>(unreadCountKey);
      qc.setQueryData(unreadCountKey, 0);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        qc.setQueryData(unreadCountKey, context.prev);
      }
    },
    onSettled: () => invalidateAllNotifications(qc),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.delete.fn,
    onSuccess: () => invalidateAllNotifications(qc),
  });
}
