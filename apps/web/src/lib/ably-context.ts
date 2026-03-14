import { createContext, useContext } from "react"

export const AblyAvailableContext = createContext(false)

/**
 * Returns true when Ably hooks are safe to call (client-side, inside provider).
 */
export function useAblyAvailable() {
  return useContext(AblyAvailableContext)
}

const EMPTY_SET = new Set<number>()
export const OnlineUserIdsContext = createContext<Set<number>>(EMPTY_SET)

/**
 * Returns true if the given user ID is currently online.
 */
export function useIsUserOnline(userId: number) {
  return useContext(OnlineUserIdsContext).has(userId)
}
