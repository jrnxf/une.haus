import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

const activeRoundsKey = games.sius.rounds.active.queryOptions().queryKey

export function useCreateFirstSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.sets.createFirst.fn,
    onSuccess: (data) => {
      toast.success("set uploaded")
      qc.invalidateQueries({ queryKey: activeRoundsKey })
      navigate({
        to: "/games/sius/sets/$setId",
        params: { setId: data.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to upload set")
    },
  })
}

export function useAddSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.sets.add.fn,
    onSuccess: (data) => {
      toast.success("successfully stacked")
      qc.invalidateQueries({ queryKey: activeRoundsKey })
      navigate({
        to: "/games/sius/sets/$setId",
        params: { setId: data.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to stack")
    },
  })
}

export function useVoteToArchive() {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()

  return useMutation({
    mutationFn: games.sius.rounds.voteToArchive.fn,
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: activeRoundsKey })
      const prev = qc.getQueryData(activeRoundsKey)

      if (sessionUser) {
        qc.setQueryData(activeRoundsKey, (old) => {
          if (!old) return old
          return old.map((round) => {
            if (round.id !== variables.data.roundId) return round
            return {
              ...round,
              archiveVotes: [
                ...round.archiveVotes,
                {
                  userId: sessionUser.id,
                  siuId: round.id,
                  createdAt: new Date(),
                  user: {
                    id: sessionUser.id,
                    name: sessionUser.name,
                    avatarId: sessionUser.avatarId,
                  },
                },
              ],
            }
          })
        })
      }

      return { prev }
    },
    onSuccess: (data) => {
      if (data.thresholdReached) {
        toast.success("vote threshold reached! admin has been notified.")
      } else {
        toast.success(`voted to archive (${data.voteCount}/5)`)
      }
    },
    onError: (error, _, context) => {
      if (context?.prev) {
        qc.setQueryData(activeRoundsKey, context.prev)
      }
      toast.error(error.message || "failed to vote")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: activeRoundsKey })
    },
  })
}

export function useRemoveArchiveVote() {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()

  return useMutation({
    mutationFn: games.sius.rounds.removeArchiveVote.fn,
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: activeRoundsKey })
      const prev = qc.getQueryData(activeRoundsKey)

      if (sessionUser) {
        qc.setQueryData(activeRoundsKey, (old) => {
          if (!old) return old
          return old.map((round) => {
            if (round.id !== variables.data.roundId) return round
            return {
              ...round,
              archiveVotes: round.archiveVotes.filter(
                (v) => v.user.id !== sessionUser.id,
              ),
            }
          })
        })
      }

      return { prev }
    },
    onSuccess: (data) => {
      toast.success(`vote removed (${data.voteCount}/5)`)
    },
    onError: (error, _, context) => {
      if (context?.prev) {
        qc.setQueryData(activeRoundsKey, context.prev)
      }
      toast.error(error.message || "failed to remove vote")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: activeRoundsKey })
    },
  })
}

export function useUpdateSet({ setId }: { setId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.sets.update.fn,
    onSuccess: () => {
      toast.success("set updated")
      qc.invalidateQueries({
        queryKey: games.sius.sets.get.queryOptions({ setId }).queryKey,
      })
      qc.invalidateQueries({ queryKey: activeRoundsKey })
      navigate({ to: "/games/sius/sets/$setId", params: { setId } })
    },
    onError: (error) => {
      toast.error(error.message || "failed to update set")
    },
  })
}

export function useDeleteSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.sets.delete.fn,
    onSuccess: () => {
      toast.success("set deleted")
      qc.removeQueries({ queryKey: activeRoundsKey })
      navigate({ to: "/games/sius" })
    },
    onError: (error) => {
      toast.error(error.message || "failed to delete set")
    },
  })
}
