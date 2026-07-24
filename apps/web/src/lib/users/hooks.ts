import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useSessionUser } from "~/lib/session/hooks"
import { users } from "~/lib/users"

type UserWithFollows = Awaited<ReturnType<typeof users.get.fn>>
type Followers = UserWithFollows["followers"]
type SessionUser = NonNullable<ReturnType<typeof useSessionUser>>

/**
 * Follow and unfollow are optimistic inverses over the same user query: they
 * share the cancel/snapshot/rollback/invalidate choreography and differ only in
 * how they transform the `followers` list. This helper owns the shared shell;
 * each caller passes its server fn, its `followers` transform, and its error
 * copy.
 */
function useFollowMutation<TVariables>({
  userId,
  mutationFn,
  applyFollowers,
  errorToast,
}: {
  userId: number
  mutationFn: (variables: TVariables) => Promise<unknown>
  applyFollowers: (followers: Followers, sessionUser: SessionUser) => Followers
  errorToast: string
}) {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()
  const queryKey = users.get.queryOptions({ userId }).queryKey

  return useMutation({
    mutationFn,
    onMutate: () => {
      qc.cancelQueries({ queryKey })

      const previousData = qc.getQueryData(queryKey)

      qc.setQueryData(queryKey, (previous) => {
        if (previous && sessionUser) {
          return {
            ...previous,
            followers: applyFollowers(previous.followers, sessionUser),
          }
        }
      })

      return { previousData }
    },
    onError: (error, _variables, context) => {
      console.error(error)
      if (context) {
        qc.setQueryData(queryKey, context.previousData)
        toast.error(errorToast)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey })
    },
  })
}

export function useFollowMutations({ userId }: { userId: number }) {
  const { mutate: follow } = useFollowMutation({
    userId,
    mutationFn: users.follow.fn,
    applyFollowers: (followers, sessionUser) => ({
      count: followers.count + 1,
      users: [
        ...followers.users,
        {
          avatarId: sessionUser.avatarId,
          id: sessionUser.id,
          name: sessionUser.name,
          location: null, // this doesn't really matter
        },
      ],
    }),
    errorToast: "failed to follow user",
  })

  const { mutate: unfollow } = useFollowMutation({
    userId,
    mutationFn: users.unfollow.fn,
    applyFollowers: (followers, sessionUser) => ({
      count: followers.count - 1,
      users: followers.users.filter((user) => user.id !== sessionUser.id),
    }),
    errorToast: "failed to unfollow user",
  })

  return { follow, unfollow }
}
