import { useMutation, useQueryClient } from "@tanstack/react-query"

import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useSessionUser } from "~/lib/session/hooks"

export function useCreateMessage(record: MessageParent) {
  const sessionUser = useSessionUser()

  const qc = useQueryClient()

  const listOptions = messages.list.queryOptions(record)

  const mutation = useMutation({
    mutationFn: messages.create.fn,

    onMutate: async (newMessage) => {
      invariant(sessionUser, "sessionUser is required")

      qc.cancelQueries({
        queryKey: listOptions.queryKey,
      })

      const prev = qc.getQueryData(listOptions.queryKey)

      qc.setQueryData(listOptions.queryKey, (prev) => {
        if (!prev) return prev

        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              content: newMessage.data.content,
              createdAt: new Date(),
              id: Math.random(),
              likes: [],
              user: sessionUser,
              userId: sessionUser.id,
            },
          ],
        }
      })

      return { prev }
    },
    onError: (error, _variables, context) => {
      console.error(error)
      if (context) {
        qc.setQueryData(listOptions.queryKey, context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: listOptions.queryKey,
      })
    },
  })

  return {
    ...mutation,
    mutate: (content: string) => {
      mutation.mutate({
        data: {
          ...record,
          content,
        },
      })
    },
  }
}
