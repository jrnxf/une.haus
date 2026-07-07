import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  isLikeableContentType,
  isMessageType,
  labels,
  queryKeyFor,
} from "~/lib/engagement/manifest"
import { useHaptics } from "~/lib/haptics"
import { invariant } from "~/lib/invariant"
import { reactions } from "~/lib/reactions"
import { type RecordWithLikesType } from "~/lib/reactions/schemas"
import { useSessionUser } from "~/lib/session/hooks"

type Like = {
  userId: number
  user: { avatarId: string | null; id: number; name: string }
}

type WithLikes = { likes: Like[] }
type WithMessages = { messages: (WithLikes & { id: number })[] }

type ReactionRecord = {
  id: number
  type: RecordWithLikesType
}

type RecordReactionArgs = {
  record: ReactionRecord
  /**
   * Optional override for the query holding the optimistic like state. Content
   * types resolve their detail query from the manifest automatically, so only
   * message types — whose likes live in a parent-scoped message list the record
   * alone can't identify — need to pass this.
   */
  optimisticUpdateQueryKey?: QueryKey
  refetchQueryKey?: QueryKey
}

/**
 * Resolve the query key holding the optimistic like state for a record. An
 * explicit override wins; otherwise a content type derives its detail query key
 * from the manifest. Message types have no derivable key (their likes live in a
 * parent's message list), so they must pass the override.
 */
function resolveOptimisticUpdateQueryKey(
  record: ReactionRecord,
  override: QueryKey | undefined,
): QueryKey {
  if (override) return override
  invariant(
    isLikeableContentType(record.type),
    `record type "${record.type}" needs an explicit optimisticUpdateQueryKey`,
  )
  return queryKeyFor(record.type, record.id)
}

type ResolvedReactionArgs = {
  record: ReactionRecord
  optimisticUpdateQueryKey: QueryKey
  refetchQueryKey?: QueryKey
}

export function useLikeUnlikeRecord({
  authUserLiked,
  ...args
}: RecordReactionArgs & {
  authUserLiked: boolean
}) {
  const resolvedArgs: ResolvedReactionArgs = {
    ...args,
    optimisticUpdateQueryKey: resolveOptimisticUpdateQueryKey(
      args.record,
      args.optimisticUpdateQueryKey,
    ),
  }

  const likeMutation = useLikeRecord(resolvedArgs)
  const unlikeMutation = useUnlikeRecord(resolvedArgs)

  return authUserLiked ? unlikeMutation : likeMutation
}

function useLikeRecord({
  record,
  optimisticUpdateQueryKey,
  refetchQueryKey,
}: ResolvedReactionArgs) {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()
  const haptics = useHaptics()

  const mutation = useMutation({
    mutationFn: reactions.like.fn,
    onMutate: async () => {
      haptics.selection()
      invariant(sessionUser, "Not authenticated")
      qc.cancelQueries({ queryKey: optimisticUpdateQueryKey })

      const prev = qc.getQueryData(optimisticUpdateQueryKey)

      const newLike: Like = {
        userId: sessionUser.id,
        user: {
          id: sessionUser.id,
          name: sessionUser.name,
          avatarId: sessionUser.avatarId,
        },
      }

      if (isMessageType(record.type)) {
        qc.setQueryData<WithMessages>(optimisticUpdateQueryKey, (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.map((message) => {
              if (message.id === record.id) {
                return {
                  ...message,
                  likes: [...message.likes, newLike],
                }
              }
              return message
            }),
          }
        })
      } else {
        qc.setQueryData<WithLikes>(optimisticUpdateQueryKey, (prev) => {
          if (!prev) return prev
          return { ...prev, likes: [...prev.likes, newLike] }
        })
      }

      return { prev }
    },
    onError: (error, _variables, context) => {
      toast.error(`failed to like ${labels[record.type]}`)
      console.error(error)
      if (context) {
        qc.setQueryData(optimisticUpdateQueryKey, context.prev)
      }
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        qc.refetchQueries({ queryKey: refetchQueryKey })
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: optimisticUpdateQueryKey })
    },
  })

  return {
    ...mutation,
    mutate: () => {
      mutation.mutate({
        data: {
          recordId: record.id,
          type: record.type,
        },
      })
    },
  }
}

function useUnlikeRecord({
  record,
  optimisticUpdateQueryKey,
  refetchQueryKey,
}: ResolvedReactionArgs) {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()
  const haptics = useHaptics()

  const mutation = useMutation({
    mutationFn: reactions.unlike.fn,
    onMutate: async () => {
      haptics.selection()
      invariant(sessionUser, "Not authenticated")

      qc.cancelQueries({ queryKey: optimisticUpdateQueryKey })

      const prev = qc.getQueryData(optimisticUpdateQueryKey)

      if (isMessageType(record.type)) {
        qc.setQueryData<WithMessages>(optimisticUpdateQueryKey, (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.map((message) => {
              if (message.id === record.id) {
                return {
                  ...message,
                  likes: message.likes.filter(
                    (like) => like.user.id !== sessionUser.id,
                  ),
                }
              }
              return message
            }),
          }
        })
      } else {
        qc.setQueryData<WithLikes>(optimisticUpdateQueryKey, (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            likes: prev.likes.filter((like) => like.userId !== sessionUser.id),
          }
        })
      }

      return {
        prev,
      }
    },
    onError: (error, _variables, context) => {
      toast.error(`failed to unlike ${labels[record.type]}`)
      console.error(error)
      if (context) {
        qc.setQueryData(optimisticUpdateQueryKey, context.prev)
      }
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        qc.refetchQueries({ queryKey: refetchQueryKey })
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: optimisticUpdateQueryKey })
    },
  })

  return {
    ...mutation,
    mutate: () => {
      mutation.mutate({
        data: {
          recordId: record.id,
          type: record.type,
        },
      })
    },
  }
}
