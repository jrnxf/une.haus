import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner"

import { useSessionUser } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"
import { computeFrontierSet } from "~/lib/tricks/compute"
import { type Trick } from "~/lib/tricks/types"

/**
 * The session user's landings plus derived landed/frontier sets. The query only
 * runs with a session user — guests get empty sets. Pass the full trick list to
 * also get the frontier ("next up") set; without it the frontier is empty.
 */
export function useLandings(allTricks?: Pick<Trick, "id" | "prerequisite">[]) {
  const sessionUser = useSessionUser()

  const { data, isPending } = useQuery({
    // userId 0 never matches a real user; the query only runs with a session
    ...tricks.landings.forUser.queryOptions({ userId: sessionUser?.id ?? 0 }),
    enabled: Boolean(sessionUser),
  })

  const landings = useMemo(() => data ?? [], [data])

  const byTrickId = useMemo(
    () => new Map(landings.map((l) => [l.trickId, l])),
    [landings],
  )

  const landedSet = useMemo(() => new Set(byTrickId.keys()), [byTrickId])

  const frontierSet = useMemo(
    () =>
      allTricks ? computeFrontierSet(allTricks, landedSet) : new Set<number>(),
    [allTricks, landedSet],
  )

  return {
    landings,
    landedSet,
    frontierSet,
    byTrickId,
    isPending: Boolean(sessionUser) && isPending,
  }
}

/** Clear every cache a landing change touches, for the remove+navigate flow. */
function useRemoveLandingQueries() {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()
  return () => {
    qc.removeQueries({
      queryKey: tricks.landings.counts.queryOptions().queryKey,
    })
    if (sessionUser) {
      qc.removeQueries({
        queryKey: tricks.landings.forUser.queryOptions({
          userId: sessionUser.id,
        }).queryKey,
      })
    }
  }
}

export function useLandTrick({ onSuccess }: { onSuccess?: () => void } = {}) {
  const removeLandingQueries = useRemoveLandingQueries()

  return useMutation({
    mutationFn: tricks.landings.land.fn,
    onSuccess: () => {
      toast.success("landing submitted")
      removeLandingQueries()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUnlandTrick() {
  const qc = useQueryClient()
  const sessionUser = useSessionUser()

  return useMutation({
    mutationFn: tricks.landings.unland.fn,
    onSuccess: () => {
      toast.success("landing removed")
      // Stay-on-page flow: refetch the live landings query in place
      if (sessionUser) {
        qc.invalidateQueries({
          queryKey: tricks.landings.forUser.queryOptions({
            userId: sessionUser.id,
          }).queryKey,
        })
      }
      // An active proof may have just left the reference carousel
      qc.invalidateQueries({ queryKey: tricks.graph.queryOptions().queryKey })
      qc.removeQueries({
        queryKey: tricks.landings.counts.queryOptions().queryKey,
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
