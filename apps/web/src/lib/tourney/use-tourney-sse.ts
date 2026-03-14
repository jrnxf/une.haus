import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { tourney } from "~/lib/tourney"
import { type TournamentState } from "~/lib/tourney/types"

const ADMIN_TIMEOUT_MS = 15_000

export function useTourneySSE(code: string) {
  const qc = useQueryClient()
  const queryKey = tourney.get.queryOptions({ code }).queryKey
  const [adminConnected, setAdminConnected] = useState(true)
  const lastHeartbeatRef = useRef(Date.now())

  useEffect(() => {
    const es = new EventSource(`/api/tourney/sse/${code}`)

    es.addEventListener("open", () => {
      lastHeartbeatRef.current = Date.now()
    })

    es.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data) as {
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
        lastHeartbeatRef.current = Date.now()
        setAdminConnected(true)
      } catch {
        // ignore malformed messages
      }
    })

    es.addEventListener("heartbeat", () => {
      lastHeartbeatRef.current = Date.now()
      setAdminConnected(true)
    })

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatRef.current
      setAdminConnected(elapsed < ADMIN_TIMEOUT_MS)
    }, 3000)

    return () => {
      es.close()
      clearInterval(checkInterval)
    }
  }, [code, qc, queryKey])

  return { adminConnected }
}
