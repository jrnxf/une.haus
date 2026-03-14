import { afterEach, describe, expect, it, spyOn } from "bun:test"

import {
  ONLINE_THRESHOLD_MS,
  getOnlineUserIds,
  guestCount,
  registerAnonymous,
  registerUser,
  removeAnonymous,
  removeUser,
  resetPresenceState,
} from "./state"

afterEach(() => {
  resetPresenceState()
})

describe("registerUser", () => {
  it("adds a user to the online list", () => {
    registerUser(1)
    expect(getOnlineUserIds()).toEqual([1])
  })

  it("deduplicates multiple registrations of the same user", () => {
    registerUser(1)
    registerUser(1)
    expect(getOnlineUserIds()).toEqual([1])
  })

  it("tracks multiple users", () => {
    registerUser(1)
    registerUser(2)
    registerUser(3)
    expect(getOnlineUserIds().toSorted()).toEqual([1, 2, 3])
  })
})

describe("removeUser", () => {
  it("removes a user from the online list", () => {
    registerUser(1)
    removeUser(1)
    expect(getOnlineUserIds()).toEqual([])
  })

  it("does nothing when removing a user that is not online", () => {
    registerUser(1)
    removeUser(999)
    expect(getOnlineUserIds()).toEqual([1])
  })
})

describe("registerAnonymous", () => {
  it("adds an anonymous visitor by IP", () => {
    registerAnonymous("1.2.3.4")
    expect(guestCount()).toBe(1)
  })

  it("deduplicates the same IP", () => {
    registerAnonymous("1.2.3.4")
    registerAnonymous("1.2.3.4")
    expect(guestCount()).toBe(1)
  })

  it("tracks multiple IPs", () => {
    registerAnonymous("1.2.3.4")
    registerAnonymous("5.6.7.8")
    expect(guestCount()).toBe(2)
  })
})

describe("removeAnonymous", () => {
  it("removes an anonymous visitor by IP", () => {
    registerAnonymous("1.2.3.4")
    removeAnonymous("1.2.3.4")
    expect(guestCount()).toBe(0)
  })

  it("does nothing when removing an IP that is not tracked", () => {
    registerAnonymous("1.2.3.4")
    removeAnonymous("9.9.9.9")
    expect(guestCount()).toBe(1)
  })
})

describe("login transition", () => {
  it("removes IP from anonymous map when user registers", () => {
    registerAnonymous("1.2.3.4")
    expect(guestCount()).toBe(1)
    expect(getOnlineUserIds()).toEqual([])

    registerUser(1)
    removeAnonymous("1.2.3.4")

    expect(getOnlineUserIds()).toEqual([1])
    expect(guestCount()).toBe(0)
  })
})

describe("logout transition", () => {
  it("removes user from online map on logout", () => {
    registerUser(1)
    expect(getOnlineUserIds()).toEqual([1])

    removeUser(1)
    expect(getOnlineUserIds()).toEqual([])
  })

  it("user appears as anonymous after logout", () => {
    registerUser(1)
    removeUser(1)
    registerAnonymous("1.2.3.4")

    expect(getOnlineUserIds()).toEqual([])
    expect(guestCount()).toBe(1)
  })

  it("does not double count during logout", () => {
    registerUser(1)
    removeUser(1)
    registerAnonymous("1.2.3.4")

    const total = getOnlineUserIds().length + guestCount()
    expect(total).toBe(1)
  })
})

describe("pruning stale entries", () => {
  it("prunes users who have not polled within the threshold", () => {
    const now = Date.now()
    const mock = spyOn(globalThis.Date, "now").mockReturnValue(now)

    registerUser(1)
    registerUser(2)

    mock.mockReturnValue(now + ONLINE_THRESHOLD_MS + 1)
    registerUser(2)

    expect(getOnlineUserIds()).toEqual([2])
    mock.mockRestore()
  })

  it("prunes anonymous visitors who have not polled within the threshold", () => {
    const now = Date.now()
    const mock = spyOn(globalThis.Date, "now").mockReturnValue(now)

    registerAnonymous("1.2.3.4")
    registerAnonymous("5.6.7.8")

    mock.mockReturnValue(now + ONLINE_THRESHOLD_MS + 1)
    registerAnonymous("5.6.7.8")

    expect(guestCount()).toBe(1)
    mock.mockRestore()
  })

  it("does not prune entries within the threshold", () => {
    const now = Date.now()
    const mock = spyOn(globalThis.Date, "now").mockReturnValue(now)

    registerUser(1)
    registerAnonymous("1.2.3.4")

    mock.mockReturnValue(now + ONLINE_THRESHOLD_MS - 1)

    expect(getOnlineUserIds()).toEqual([1])
    expect(guestCount()).toBe(1)
    mock.mockRestore()
  })
})

describe("mixed users and guests", () => {
  it("tracks both simultaneously", () => {
    registerUser(1)
    registerUser(2)
    registerAnonymous("1.2.3.4")
    registerAnonymous("5.6.7.8")

    expect(getOnlineUserIds().toSorted()).toEqual([1, 2])
    expect(guestCount()).toBe(2)

    const total = getOnlineUserIds().length + guestCount()
    expect(total).toBe(4)
  })

  it("handles complex login/logout scenario", () => {
    registerAnonymous("1.2.3.4")
    registerAnonymous("5.6.7.8")
    expect(guestCount()).toBe(2)
    expect(getOnlineUserIds()).toEqual([])

    registerUser(10)
    removeAnonymous("1.2.3.4")
    expect(guestCount()).toBe(1)
    expect(getOnlineUserIds()).toEqual([10])

    registerUser(20)
    removeAnonymous("5.6.7.8")
    expect(guestCount()).toBe(0)
    expect(getOnlineUserIds().toSorted()).toEqual([10, 20])

    removeUser(10)
    registerAnonymous("1.2.3.4")
    expect(getOnlineUserIds()).toEqual([20])
    expect(guestCount()).toBe(1)

    const total = getOnlineUserIds().length + guestCount()
    expect(total).toBe(2)
  })
})

describe("resetPresenceState", () => {
  it("clears all state", () => {
    registerUser(1)
    registerUser(2)
    registerAnonymous("1.2.3.4")

    resetPresenceState()

    expect(getOnlineUserIds()).toEqual([])
    expect(guestCount()).toBe(0)
  })
})
