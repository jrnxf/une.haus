import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { games } from "~/lib/games"

const roundsKey = games.bius.rounds.queryOptions().queryKey

export function useCreateFirstSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.bius.sets.createFirst.fn,
    onSuccess: (data) => {
      toast.success("set uploaded")
      qc.invalidateQueries({ queryKey: roundsKey })
      navigate({
        to: "/games/bius/sets/$setId",
        params: { setId: data.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to upload set")
    },
  })
}

export function useBackUpSet() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.bius.sets.backUp.fn,
    onSuccess: (data) => {
      toast.success("successfully backed up set")
      qc.invalidateQueries({ queryKey: roundsKey })
      navigate({
        to: "/games/bius/sets/$setId",
        params: { setId: data.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to back up set")
    },
  })
}

export function useDeleteSet(roundId?: number) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: games.bius.sets.delete.fn,
    onSuccess: (_data) => {
      toast.success("set deleted")
      qc.removeQueries({ queryKey: roundsKey })
      if (roundId) {
        navigate({ to: "/games/bius/$roundId", params: { roundId } })
      } else {
        navigate({ to: "/games/bius" })
      }
    },
    onError: (error) => {
      toast.error(error.message || "failed to delete set")
    },
  })
}
