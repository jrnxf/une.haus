import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { notifications } from "~/lib/notifications"

const unreadCountKey = notifications.unreadCount.queryOptions().queryKey

function invalidateAllNotifications(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["notifications.list"] })
  qc.invalidateQueries({ queryKey: ["notifications.grouped"] })
  qc.invalidateQueries({ queryKey: unreadCountKey })
}

export function useMarkGroupRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: notifications.markGroupRead.fn,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: unreadCountKey })
      const prev = qc.getQueryData<number>(unreadCountKey)
      if (prev !== undefined && prev > 0) {
        qc.setQueryData(unreadCountKey, prev - 1)
      }
      return { prev }
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["notifications.list"] })
      qc.removeQueries({ queryKey: ["notifications.grouped"] })
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        qc.setQueryData(unreadCountKey, context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: unreadCountKey })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: notifications.markAllRead.fn,
    onMutate: async () => {
      // Optimistically set unread count to 0
      await qc.cancelQueries({ queryKey: unreadCountKey })
      const prev = qc.getQueryData<number>(unreadCountKey)
      qc.setQueryData(unreadCountKey, 0)
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        qc.setQueryData(unreadCountKey, context.prev)
      }
    },
    onSettled: () => invalidateAllNotifications(qc),
  })
}
