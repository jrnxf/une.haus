import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { games } from "~/lib/games"

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
