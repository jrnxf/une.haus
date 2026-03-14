// Must be > poll interval (15s) to avoid flicker between polls.
// 2x gives one missed poll of grace before a user drops off.
export const ONLINE_THRESHOLD_MS = 30 * 1000

// All online status is tracked in-memory. Ephemeral by design —
// lost on server restart, rebuilds within 15s as clients poll.
// Logged-in users keyed by user ID, anonymous visitors keyed by IP.
const onlineUsers = new Map<number, number>()
const anonymousVisitors = new Map<string, number>()

function prune(map: Map<string | number, number>) {
  const cutoff = Date.now() - ONLINE_THRESHOLD_MS
  for (const [key, lastSeen] of map) {
    if (lastSeen < cutoff) {
      map.delete(key)
    }
  }
}

export function registerUser(userId: number) {
  onlineUsers.set(userId, Date.now())
  prune(onlineUsers)
}

export function removeUser(userId: number) {
  onlineUsers.delete(userId)
}

export function registerAnonymous(ip: string) {
  anonymousVisitors.set(ip, Date.now())
  prune(anonymousVisitors)
}

export function removeAnonymous(ip: string) {
  anonymousVisitors.delete(ip)
}

export function getOnlineUserIds(): number[] {
  prune(onlineUsers)
  return [...onlineUsers.keys()]
}

export function guestCount(): number {
  prune(anonymousVisitors)
  return anonymousVisitors.size
}

/** Reset all state. Used in tests. */
export function resetPresenceState() {
  onlineUsers.clear()
  anonymousVisitors.clear()
}
