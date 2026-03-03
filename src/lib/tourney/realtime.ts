import { EventEmitter } from "node:events"

type TourneyUpdate = { phase: string; state: unknown; updatedAt: number }

const emitter = new EventEmitter()
emitter.setMaxListeners(200)

/**
 * Publish a tournament state update. Notifies all SSE subscribers in-process.
 */
export function publishTourneyUpdate(code: string, data: TourneyUpdate): void {
  emitter.emit(`tourney:${code}`, data)
}

/**
 * Subscribe to live updates for a tournament code.
 * Returns an unsubscribe function.
 */
export function subscribeTourneyUpdates(
  code: string,
  listener: (data: TourneyUpdate) => void,
): () => void {
  emitter.on(`tourney:${code}`, listener)
  return () => {
    emitter.off(`tourney:${code}`, listener)
  }
}

/**
 * Publish an admin heartbeat (no DB write, just in-process).
 */
export function publishAdminHeartbeat(code: string): void {
  emitter.emit(`tourney-heartbeat:${code}`)
}

/**
 * Subscribe to admin heartbeat events.
 * Returns an unsubscribe function.
 */
export function subscribeAdminHeartbeat(
  code: string,
  listener: () => void,
): () => void {
  emitter.on(`tourney-heartbeat:${code}`, listener)
  return () => {
    emitter.off(`tourney-heartbeat:${code}`, listener)
  }
}
