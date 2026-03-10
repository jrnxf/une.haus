import { useSuspenseQuery } from "@tanstack/react-query"
import { usePresenceListener } from "ably/react"
import { useMemo } from "react"

import { users as usersApi } from "~/lib/users"

type OnlineData = {
  users: { id: number; name: string; avatarId: string | null }[]
  guests: number
  total: number
}

/**
 * Derives the online users list from Ably's "app" presence channel.
 * Must only be called client-side inside AblyProvider.
 */
export function useOnlineUsers(): OnlineData {
  const { presenceData } = usePresenceListener({ channelName: "app" })
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions())

  return useMemo(() => {
    const usersMap = new Map<
      number,
      { id: number; name: string; avatarId: string | null }
    >()
    for (const u of allUsers) usersMap.set(u.id, u)

    const onlineUsers: { id: number; name: string; avatarId: string | null }[] =
      []
    const seenUserIds = new Set<number>()
    const seenGuestIds = new Set<string>()

    for (const member of presenceData) {
      if (member.clientId.startsWith("user:")) {
        const userId = Number(member.clientId.slice(5))
        if (seenUserIds.has(userId)) continue
        seenUserIds.add(userId)
        const user = usersMap.get(userId)
        if (user) onlineUsers.push(user)
      } else {
        seenGuestIds.add(member.clientId)
      }
    }
    const guests = seenGuestIds.size

    return {
      users: onlineUsers,
      guests,
      total: onlineUsers.length + guests,
    }
  }, [presenceData, allUsers])
}
