import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { useHaptics } from "~/lib/haptics"
import { invariant } from "~/lib/invariant"
import { reactions } from "~/lib/reactions"
import {
  type RecordWithLikesType,
  recordTypeToLabel,
} from "~/lib/reactions/schemas"
import { useSessionUser } from "~/lib/session/hooks"

type Like = {
  userId: number
  user: { avatarId: string | null; id: number; name: string }
}

type WithLikes = { likes: Like[] }
type WithMessages = { messages: (WithLikes & { id: number })[] }

const MESSAGE_TYPES: ReadonlySet<RecordWithLikesType> = new Set([
  "chatMessage",
  "postMessage",
  "riuSetMessage",
  "riuSubmissionMessage",
  "utvVideoMessage",
  "biuSetMessage",
  "siuSetMessage",
])

type RecordReactionArgs = {
  record: {
    id: number
    type: RecordWithLikesType
  }
  optimisticUpdateQueryKey: QueryKey
  refetchQueryKey?: QueryKey
}

export function useLikeUnlikeRecord({
  authUserLiked,
  ...args
}: RecordReactionArgs & {
  authUserLiked: boolean
}) {
  const likeMutation = useLikeRecord(args)
  const unlikeMutation = useUnlikeRecord(args)

  return authUserLiked ? unlikeMutation : likeMutation
}

function useLikeRecord({
  record,
  optimisticUpdateQueryKey,
  refetchQueryKey,
}: RecordReactionArgs) {
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

      if (MESSAGE_TYPES.has(record.type)) {
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
      toast.error(`failed to like ${recordTypeToLabel[record.type]}`)
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
}: RecordReactionArgs) {
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

      if (MESSAGE_TYPES.has(record.type)) {
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
      toast.error(`failed to unlike ${recordTypeToLabel[record.type]}`)
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
