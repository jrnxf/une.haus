import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { useSessionUser } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"
import { computeFrontierSet, computeLandedSet } from "~/lib/tricks/compute"
import { type Trick } from "~/lib/tricks/types"

/**
 * The session user's landings plus derived landed/frontier sets. The query only
 * runs with a session user — guests get empty sets. Pass the full trick list to
 * also get the frontier ("next up") set; without it the frontier is empty.
 */
export function useLandings(allTricks?: Pick<Trick, "id" | "prerequisite">[]) {
  const sessionUser = useSessionUser()

  const { data, isPending } = useQuery({
    ...tricks.landings.mine.queryOptions(),
    enabled: Boolean(sessionUser),
  })

  const landings = useMemo(() => data ?? [], [data])

  const landedSet = useMemo(() => computeLandedSet(landings), [landings])

  const frontierSet = useMemo(
    () =>
      allTricks ? computeFrontierSet(allTricks, landedSet) : new Set<number>(),
    [allTricks, landedSet],
  )

  const byTrickId = useMemo(
    () => new Map(landings.map((l) => [l.trickId, l])),
    [landings],
  )

  return {
    landings,
    landedSet,
    frontierSet,
    byTrickId,
    isPending: Boolean(sessionUser) && isPending,
  }
}
