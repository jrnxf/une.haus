import { EventEmitter } from "node:events"

type TourneyUpdate = { phase: string; state: unknown; updatedAt: number }

const emitter = new EventEmitter()
emitter.setMaxListeners(200)

export function publishTourneyUpdate(code: string, data: TourneyUpdate): void {
  emitter.emit(`tourney:${code}`, data)
}

export function subscribeTourneyUpdates(
  code: string,
  listener: (data: TourneyUpdate) => void,
): () => void {
  emitter.on(`tourney:${code}`, listener)
  return () => {
    emitter.off(`tourney:${code}`, listener)
  }
}

export function publishAdminHeartbeat(code: string): void {
  emitter.emit(`tourney-heartbeat:${code}`)
}

export function subscribeAdminHeartbeat(
  code: string,
  listener: () => void,
): () => void {
  emitter.on(`tourney-heartbeat:${code}`, listener)
  return () => {
    emitter.off(`tourney-heartbeat:${code}`, listener)
  }
}
