import { afterEach, describe, expect, it, mock } from "bun:test"

import {
  publishAdminHeartbeat,
  publishTourneyUpdate,
  subscribeAdminHeartbeat,
  subscribeTourneyUpdates,
} from "./realtime"

describe("subscribeTourneyUpdates", () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups) cleanup()
    cleanups.length = 0
  })

  it("delivers published updates to subscriber", () => {
    const listener = mock()
    cleanups.push(subscribeTourneyUpdates("ABCD", listener))

    const data = { phase: "prelims", state: {}, updatedAt: Date.now() }
    publishTourneyUpdate("ABCD", data)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(data)
  })

  it("does not deliver updates for a different code", () => {
    const listener = mock()
    cleanups.push(subscribeTourneyUpdates("ABCD", listener))

    publishTourneyUpdate("WXYZ", {
      phase: "bracket",
      state: {},
      updatedAt: Date.now(),
    })

    expect(listener).toHaveBeenCalledTimes(0)
  })

  it("delivers to multiple subscribers", () => {
    const listener1 = mock()
    const listener2 = mock()
    cleanups.push(subscribeTourneyUpdates("ABCD", listener1))
    cleanups.push(subscribeTourneyUpdates("ABCD", listener2))

    const data = { phase: "prelims", state: {}, updatedAt: Date.now() }
    publishTourneyUpdate("ABCD", data)

    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
  })

  it("stops delivering after unsubscribe", () => {
    const listener = mock()
    const unsubscribe = subscribeTourneyUpdates("ABCD", listener)

    publishTourneyUpdate("ABCD", {
      phase: "prelims",
      state: {},
      updatedAt: Date.now(),
    })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()

    publishTourneyUpdate("ABCD", {
      phase: "bracket",
      state: {},
      updatedAt: Date.now(),
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe("subscribeAdminHeartbeat", () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups) cleanup()
    cleanups.length = 0
  })

  it("delivers heartbeat to subscriber", () => {
    const listener = mock()
    cleanups.push(subscribeAdminHeartbeat("ABCD", listener))

    publishAdminHeartbeat("ABCD")

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("does not deliver heartbeat for a different code", () => {
    const listener = mock()
    cleanups.push(subscribeAdminHeartbeat("ABCD", listener))

    publishAdminHeartbeat("WXYZ")

    expect(listener).toHaveBeenCalledTimes(0)
  })

  it("stops delivering after unsubscribe", () => {
    const listener = mock()
    const unsubscribe = subscribeAdminHeartbeat("ABCD", listener)

    publishAdminHeartbeat("ABCD")
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()

    publishAdminHeartbeat("ABCD")
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
