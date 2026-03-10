import { ChannelProvider, usePresence } from "ably/react"

import { useAblyAvailable } from "~/lib/ably-context"

/**
 * Enters the tournament's presence channel as the admin.
 * Spectators see admin enter/leave events in real-time.
 * Mount in every admin tournament route. No-op during SSR.
 */
export function AdminPresence({ code }: { code: string }) {
  const available = useAblyAvailable()

  if (!available) return null

  return (
    <ChannelProvider channelName={`tourney-${code}`}>
      <AdminPresenceInner code={code} />
    </ChannelProvider>
  )
}

function AdminPresenceInner({ code }: { code: string }) {
  usePresence({ channelName: `tourney-${code}` }, "admin")
  return null
}
