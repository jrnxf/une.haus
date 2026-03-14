import * as Ably from "ably"
import { AblyProvider as AblyReactProvider, ChannelProvider } from "ably/react"
import { usePresence, usePresenceListener } from "ably/react"
import { type ReactNode, useMemo } from "react"

import { AblyAvailableContext, OnlineUserIdsContext } from "~/lib/ably-context"

/**
 * Wraps the app in Ably's React provider with token auth.
 * During SSR (no window), renders children without Ably context.
 * Use `useAblyAvailable()` from ably-context to guard Ably hook usage.
 */
export function AblyProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    if (typeof window === "undefined") return null
    return new Ably.Realtime({
      authUrl: "/api/ably/auth",
      autoConnect: true,
    })
  }, [])

  if (!client) return <>{children}</>

  return (
    <AblyReactProvider client={client}>
      <AblyAvailableContext.Provider value={true}>
        <ChannelProvider channelName="app">
          <AppPresence />
          <OnlineUserIdsProvider>{children}</OnlineUserIdsProvider>
        </ChannelProvider>
      </AblyAvailableContext.Provider>
    </AblyReactProvider>
  )
}

/**
 * Enters the global "app" presence channel. Only rendered client-side.
 */
function AppPresence() {
  usePresence({ channelName: "app" })
  return null
}

/**
 * Derives a Set of online user IDs from Ably presence and provides it via context.
 */
function OnlineUserIdsProvider({ children }: { children: ReactNode }) {
  const { presenceData } = usePresenceListener({ channelName: "app" })

  const onlineIds = useMemo(() => {
    const ids = new Set<number>()
    for (const member of presenceData) {
      if (member.clientId.startsWith("user:")) {
        ids.add(Number(member.clientId.slice(5)))
      }
    }
    return ids
  }, [presenceData])

  return (
    <OnlineUserIdsContext.Provider value={onlineIds}>
      {children}
    </OnlineUserIdsContext.Provider>
  )
}
