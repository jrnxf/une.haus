import { useQueryClient } from "@tanstack/react-query"
import { useChannel, usePresenceListener } from "ably/react"
import { useMemo } from "react"

import { tourney } from "~/lib/tourney"
import { type TournamentState } from "~/lib/tourney/types"

/**
 * Subscribes to live tournament updates and admin presence via Ably.
 * Used by spectators on /tourney/$code/live.
 * Must be rendered inside a <ChannelProvider channelName={`tourney-${code}`}>.
 */
export function useTourneyLive(code: string) {
  const qc = useQueryClient()
  const queryKey = tourney.get.queryOptions({ code }).queryKey
  const channelName = `tourney-${code}`

  useChannel({ channelName }, "state-update", (message) => {
    const data = message.data as {
      phase: string
      state: TournamentState
      updatedAt: number
    }
    qc.setQueryData(queryKey, (old) => {
      if (!old) return old
      return {
        ...old,
        phase: data.phase as typeof old.phase,
        state: data.state,
      }
    })
  })

  const { presenceData } = usePresenceListener({ channelName })

  const adminConnected = useMemo(
    () => presenceData.some((m) => m.clientId.startsWith("user:")),
    [presenceData],
  )

  return { adminConnected }
}
