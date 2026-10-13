import { describe, expect, it } from "bun:test"

import {
  archiveIndex,
  chooseLead,
  chooseNewOrArchive,
  chooseTalk,
  isFresh,
  STALE_AFTER_MS,
} from "./slots"

const now = new Date("2026-10-13T12:00:00Z")
const ago = (ms: number) => ({ createdAt: new Date(now.getTime() - ms) })
const fresh = ago(60 * 1000)
const stale = ago(STALE_AFTER_MS)

describe("isFresh", () => {
  it("treats anything younger than a week as fresh", () => {
    expect(isFresh(ago(STALE_AFTER_MS - 1), now)).toBe(true)
  })

  it("treats a week old, or missing, as stale", () => {
    expect(isFresh(stale, now)).toBe(false)
    expect(isFresh(null, now)).toBe(false)
  })
})

describe("archiveIndex", () => {
  it("stays put within a day and moves on the next", () => {
    const laterToday = new Date("2026-10-13T23:59:00Z")
    const tomorrow = new Date("2026-10-14T00:00:00Z")
    expect(archiveIndex(laterToday, 10)).toBe(archiveIndex(now, 10))
    expect(archiveIndex(tomorrow, 10)).toBe((archiveIndex(now, 10) + 1) % 10)
  })

  it("stays inside the archive and survives an empty one", () => {
    expect(archiveIndex(now, 3)).toBeLessThan(3)
    expect(archiveIndex(now, 3, 1)).toBe((archiveIndex(now, 3) + 1) % 3)
    expect(archiveIndex(now, 0)).toBe(0)
  })
})

describe("chooseLead", () => {
  const clip = { title: "vault clip" }

  it("leads with a fresh rider video", () => {
    expect(chooseLead({ newestVideo: fresh, vaultClip: clip, now })).toEqual({
      source: "latest",
      item: fresh,
    })
  })

  it("swaps a stale video for a vault clip", () => {
    expect(chooseLead({ newestVideo: stale, vaultClip: clip, now })).toEqual({
      source: "vault",
      item: clip,
    })
  })

  it("keeps a stale video when there is no vault clip", () => {
    expect(chooseLead({ newestVideo: stale, vaultClip: null, now })).toEqual({
      source: "latest",
      item: stale,
    })
  })

  it("is empty only when there is nothing at all", () => {
    expect(chooseLead({ newestVideo: null, vaultClip: null, now })).toBeNull()
  })
})

describe("chooseNewOrArchive", () => {
  it("announces a fresh newest item as new", () => {
    expect(
      chooseNewOrArchive({ newest: fresh, archivePick: stale, now }),
    ).toEqual({ isNew: true, item: fresh })
  })

  it("shows the archive pick, unannounced, once the newest is stale", () => {
    const pick = ago(STALE_AFTER_MS * 20)
    expect(
      chooseNewOrArchive({ newest: stale, archivePick: pick, now }),
    ).toEqual({ isNew: false, item: pick })
  })

  it("falls back to the stale newest item without an archive", () => {
    expect(
      chooseNewOrArchive({ newest: stale, archivePick: null, now }),
    ).toEqual({ isNew: false, item: stale })
  })

  it("is empty when there is nothing at all", () => {
    expect(
      chooseNewOrArchive({ newest: null, archivePick: null, now }),
    ).toBeNull()
  })
})

describe("chooseTalk", () => {
  it("shows a fresh chat line", () => {
    expect(chooseTalk({ lastMessage: fresh, now })).toEqual({
      kind: "chat",
      message: fresh,
    })
  })

  it("gives the slot to the arcade when chat is stale or empty", () => {
    expect(chooseTalk({ lastMessage: stale, now })).toEqual({ kind: "arcade" })
    expect(chooseTalk({ lastMessage: null, now })).toEqual({ kind: "arcade" })
  })
})
