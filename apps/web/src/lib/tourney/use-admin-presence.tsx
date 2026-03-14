import { useEffect } from "react"

import { adminHeartbeatServerFn } from "~/lib/tourney/fns"

const HEARTBEAT_INTERVAL_MS = 5000

/**
 * Sends periodic heartbeats so spectators know the admin is connected.
 * Mount in every admin tournament route.
 */
export function AdminPresence({ code }: { code: string }) {
  useEffect(() => {
    const send = () => void adminHeartbeatServerFn({ data: { code } })
    send()
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [code])

  return null
}
