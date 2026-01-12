import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notifications } from "~/lib/notifications";

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.markRead.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications.list"] });
      qc.invalidateQueries({ queryKey: ["notifications.grouped"] });
      qc.invalidateQueries({ queryKey: ["notifications.unreadCount"] });
    },
  });
}

export function useMarkGroupRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.markGroupRead.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications.list"] });
      qc.invalidateQueries({ queryKey: ["notifications.grouped"] });
      qc.invalidateQueries({ queryKey: ["notifications.unreadCount"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.markAllRead.fn,
    onMutate: async () => {
      // Optimistically set unread count to 0
      await qc.cancelQueries({ queryKey: ["notifications.unreadCount"] });
      const prev = qc.getQueryData<number>(["notifications.unreadCount"]);
      qc.setQueryData(["notifications.unreadCount"], 0);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        qc.setQueryData(["notifications.unreadCount"], context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications.list"] });
      qc.invalidateQueries({ queryKey: ["notifications.grouped"] });
      qc.invalidateQueries({ queryKey: ["notifications.unreadCount"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notifications.delete.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications.list"] });
      qc.invalidateQueries({ queryKey: ["notifications.grouped"] });
      qc.invalidateQueries({ queryKey: ["notifications.unreadCount"] });
    },
  });
}
