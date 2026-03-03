import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { games } from "~/lib/games"

const activeRoundsKey = games.sius.rounds.active.queryOptions().queryKey

export function useStartRound() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.rounds.start.fn,
    onSuccess: (data) => {
      toast.success("successfully started a new siu")
      qc.invalidateQueries({ queryKey: activeRoundsKey })
      navigate({
        to: "/games/sius/sets/$setId",
        params: { setId: data.set.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to start round")
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

  return useMutation({
    mutationFn: games.sius.rounds.voteToArchive.fn,
    onSuccess: (data) => {
      if (data.thresholdReached) {
        toast.success("vote threshold reached! admin has been notified.")
      } else {
        toast.success(`voted to archive (${data.voteCount}/5)`)
      }
      qc.invalidateQueries({ queryKey: activeRoundsKey })
    },
    onError: (error) => {
      toast.error(error.message || "failed to vote")
    },
  })
}

export function useRemoveArchiveVote() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.rounds.removeArchiveVote.fn,
    onSuccess: (data) => {
      toast.success(`vote removed (${data.voteCount}/5)`)
      qc.invalidateQueries({ queryKey: activeRoundsKey })
    },
    onError: (error) => {
      toast.error(error.message || "failed to remove vote")
    },
  })
}

export function useArchiveRound() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.admin.archiveRound.fn,
    onSuccess: () => {
      toast.success("round archived")
      qc.removeQueries({ queryKey: activeRoundsKey })
      qc.removeQueries({
        queryKey: games.sius.rounds.archived.list.queryOptions().queryKey,
      })
      navigate({ to: "/games/sius" })
    },
    onError: (error) => {
      toast.error(error.message || "failed to archive round")
    },
  })
}

export function useDeleteSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.sius.sets.delete.fn,
    onSuccess: (data) => {
      toast.success("set deleted")
      qc.removeQueries({ queryKey: activeRoundsKey })
      if (data.type === "soft") {
        // Soft delete: invalidate to refresh the round view
        qc.invalidateQueries({ queryKey: activeRoundsKey })
      }
      navigate({ to: "/games/sius" })
    },
    onError: (error) => {
      toast.error(error.message || "failed to delete set")
    },
  })
}
