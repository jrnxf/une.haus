import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

export function useCreateSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const upcomingRosterQueryKey =
    games.rius.upcoming.roster.queryOptions().queryKey

  return useMutation({
    mutationFn: games.rius.sets.create.fn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: upcomingRosterQueryKey,
      })
    },
    onSuccess: () => {
      toast.success("set created")

      // https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#hydration-api-changes
      // https://github.com/TanStack/query/discussions/3169#discussioncomment-12437333
      // to avoid flashing stale data due to hydration now happening in an
      // effect, removing the query before redirecting means the prefetched
      // value in the RSC will be used immediately
      qc.removeQueries({
        queryKey: upcomingRosterQueryKey,
      })

      navigate({ to: "/games/rius/upcoming" })
    },
  })
}

export function useCreateSubmission() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: games.rius.submissions.create.fn,
    onSuccess: (data) => {
      toast.success("submission uploaded", {
        action: {
          label: "View",
          onClick: () => {
            navigate({ to: `/games/rius/submissions/${data.id}` })
          },
        },
      })
    },
    onError: (error) => {
      toast.error("failed to create submission")
      console.error(error)
    },
  })
}

export function useUpdateSet({ setId }: { setId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.rius.sets.update.fn,
    onSuccess: () => {
      toast.success("set updated")
      qc.invalidateQueries({
        queryKey: games.rius.sets.get.queryOptions({ setId }).queryKey,
      })
      qc.invalidateQueries({
        queryKey: games.rius.upcoming.roster.queryOptions().queryKey,
      })
      navigate({ to: "/games/rius/sets/$setId", params: { setId } })
    },
    onError: (error) => {
      toast.error(error.message || "failed to update set")
      console.error(error)
    },
  })
}

export function useDeleteSet({
  redirectToUpcoming = false,
}: { redirectToUpcoming?: boolean } = {}) {
  const sessionUser = useSessionUser()
  const navigate = useNavigate()

  const qc = useQueryClient()

  const upcomingRosterQueryKey =
    games.rius.upcoming.roster.queryOptions().queryKey

  return useMutation({
    mutationFn: games.rius.sets.delete.fn,
    onMutate: ({ data: { riuSetId } }) => {
      qc.cancelQueries({
        queryKey: upcomingRosterQueryKey,
      })

      const previousData = qc.getQueryData(upcomingRosterQueryKey)

      qc.setQueryData(upcomingRosterQueryKey, (previous) => {
        const nextAuthUserSets =
          previous?.authUserSets?.filter((set) => set.id !== riuSetId) ?? []

        const nextRoster = { ...previous?.roster }
        if (sessionUser && nextAuthUserSets.length === 0) {
          delete nextRoster[sessionUser?.id]
        }

        return {
          authUserSets: nextAuthUserSets,
          roster: nextRoster,
          round: previous?.round,
        }
      })

      return { previousData }
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: upcomingRosterQueryKey,
      }),
    onSuccess: (_data, { data: { riuSetId } }) => {
      qc.removeQueries({
        queryKey: games.rius.sets.get.queryOptions({ setId: riuSetId })
          .queryKey,
      })
      toast.success("set deleted")
      if (redirectToUpcoming) {
        navigate({ to: "/games/rius/upcoming" })
      }
    },
    onError: (error) => {
      toast.error(error.message || "failed to delete set")
      console.error(error)
    },
  })
}

export function useDeleteSubmission({ setId }: { setId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.rius.submissions.delete.fn,
    onSuccess: () => {
      toast.success("submission deleted")
      qc.invalidateQueries({
        queryKey: games.rius.active.list.queryOptions().queryKey,
      })
      qc.removeQueries({
        queryKey: games.rius.sets.get.queryOptions({ setId }).queryKey,
      })
      navigate({ to: "/games/rius/sets/$setId", params: { setId } })
    },
    onError: (error) => {
      toast.error("failed to delete submission")
      console.error(error)
    },
  })
}
