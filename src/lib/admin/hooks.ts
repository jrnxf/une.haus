import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { admin } from "~/lib/admin"

/**
 * A review mutation for one item of an admin queue. It removes the item from
 * the cached list at once, and puts the list back when the server refuses.
 */
export function useQueueMutation<TVariables>({
  queryKey,
  mutationFn,
  itemId,
  onSuccess,
}: {
  /** The exact key of the list that holds the item. */
  queryKey: QueryKey
  mutationFn: (variables: TVariables) => Promise<unknown>
  itemId: (variables: TVariables) => number
  onSuccess: (variables: TVariables) => void
}) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<{ id: number }[]>(queryKey)
      const id = itemId(variables)
      qc.setQueryData<{ id: number }[]>(queryKey, (old) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onSuccess: (_, variables) => onSuccess(variables),
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey })
      // The count chips in the sidebar and on the queue tab.
      qc.invalidateQueries({
        queryKey: admin.pendingCount.queryOptions().queryKey,
      })
    },
  })
}
